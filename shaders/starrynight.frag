#include "common.h"

uniform float g_Time;
uniform float g_Scheme; // {"material":"Scheme","default":0,"range":[0,7]}
uniform vec3 g_CustomTop; // {"material":"CustomTop","default":"0 0 0","type":"color"}
uniform vec3 g_CustomBottom; // {"material":"CustomBottom","default":"0.078 0.169 0.267","type":"color"}
uniform vec3 g_CustomStar; // {"material":"CustomStar","default":"1 1 1","type":"color"}
uniform float g_StarDensity; // {"material":"StarDensity","default":1.0,"range":[0.2,3.0]}
uniform float g_ShootingSpeed; // {"material":"ShootingSpeed","default":1.0,"range":[0.0,2.5]}

varying vec2 v_TexCoord;

float hash21(vec2 p) {
	p = frac(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return frac(p.x * p.y);
}

vec2 hash22(vec2 p) {
	vec3 a = frac(p.xyx * vec3(123.34, 234.34, 345.65));
	a += dot(a, a + 34.45);
	return frac(vec2(a.x * a.y, a.y * a.z));
}

float starLayer(vec2 uv, float scale, float density, float time) {
	vec2 gv = frac(uv * scale) - 0.5;
	vec2 id = floor(uv * scale);
	float h = hash21(id);
	float keep = step(1.0 - saturate(density * 0.35), h);
	vec2 offset = (hash22(id) - 0.5) * 0.72;
	vec2 p = gv - offset;
	float d = length(p) * scale;

	// Core star (1px-2px sharp dot)
	float size = mix(0.85, 1.45, frac(h * 17.3));
	float core = smoothstep(size, size * 0.2, d);

	// 20% of stars twinkle with soft glow (like twinkle1..4 in StarryNight)
	float isTwinkle = step(0.8, frac(h * 31.7));
	float phase = h * 6.28318 + time * 1.2566;
	float glowPulse = max(0.0, sin(phase)) * isTwinkle;
	float halo = smoothstep(size * 4.5, 0.0, d) * 0.38 * glowPulse;

	float baseAlpha = mix(0.5, 1.0, frac(h * 53.1));
	return (core * baseAlpha + halo) * keep;
}

float shootingStar(vec2 uv, float seed, float time, float speed) {
	if (speed <= 0.01) return 0.0;
	float cycleDur = mix(3.5, 6.5, hash21(vec2(seed, 1.7))) / max(0.2, speed);
	float tTotal = time + seed * 11.3;
	float cycleId = floor(tTotal / cycleDur);
	float localT = frac(tTotal / cycleDur);

	// Active for first 55% of cycle, rest is delay
	float activeT = localT / 0.55;
	if (activeT > 1.0) return 0.0;

	vec2 rnd = hash22(vec2(cycleId, seed * 7.1));
	// Spawn in upper-right area, travel down-left at 315 degrees
	vec2 startPos = vec2(mix(0.35, 1.15, rnd.x), mix(-0.08, 0.45, rnd.y));
	vec2 dir = normalize(vec2(-1.0, 0.5625)); // 45 deg in 16:9 aspect

	float travelDist = 1.15;
	float tailLen = 0.22;
	vec2 headPos = startPos + dir * (activeT * travelDist);

	vec2 toPix = uv - headPos;
	// Project onto tail direction (-dir)
	vec2 tailDir = -dir;
	float proj = dot(toPix, tailDir);
	float perp = length(toPix - tailDir * clamp(proj, 0.0, tailLen));

	// Tail fade along length
	float alongFade = saturate(1.0 - proj / tailLen) * step(0.0, proj);
	float lineCore = smoothstep(0.0018, 0.0003, perp) * alongFade;

	// Glowing head
	float headDist = length(toPix * vec2(1.777, 1.0));
	float headCore = smoothstep(0.0035, 0.0008, headDist);
	float headGlow = smoothstep(0.016, 0.0, headDist) * 0.22;

	// Fade out in last 30% of animation (70% -> 100%)
	float lifeFade = activeT < 0.7 ? 1.0 : saturate(1.0 - (activeT - 0.7) / 0.3);
	return (lineCore + headCore + headGlow) * lifeFade;
}

void main() {
	vec2 uv = v_TexCoord;

	// Select official StarryNight color scheme from color.ini
	vec3 topColor = vec3(0.0, 0.0, 0.0);
	vec3 bottomColor = vec3(0.078, 0.169, 0.267); // #142b44 Base
	vec3 starColor = vec3(1.0, 1.0, 1.0);

	int s = int(g_Scheme + 0.5);
	if (s == 1) {
		// Cotton-candy: top #ff71b2, bottom #509be1
		topColor = vec3(1.0, 0.443, 0.698);
		bottomColor = vec3(0.314, 0.608, 0.882);
	} else if (s == 2) {
		// Forest: top #000000, bottom #14442b
		topColor = vec3(0.0, 0.0, 0.0);
		bottomColor = vec3(0.078, 0.267, 0.169);
	} else if (s == 3) {
		// Galaxy: top #00076f, bottom #b133c9
		topColor = vec3(0.0, 0.027, 0.435);
		bottomColor = vec3(0.694, 0.200, 0.788);
	} else if (s == 4) {
		// Orange: top #000000, bottom #e69138, star #ffe234
		topColor = vec3(0.0, 0.0, 0.0);
		bottomColor = vec3(0.902, 0.569, 0.220);
		starColor = vec3(1.0, 0.886, 0.204);
	} else if (s == 5) {
		// Sky: top #1e48a9, bottom #62cff4
		topColor = vec3(0.118, 0.282, 0.663);
		bottomColor = vec3(0.384, 0.812, 0.957);
	} else if (s == 6) {
		// Sunrise: top #FFAE41, bottom #F83D41
		topColor = vec3(1.0, 0.682, 0.255);
		bottomColor = vec3(0.973, 0.239, 0.255);
	} else if (s == 7) {
		// Custom
		topColor = g_CustomTop;
		bottomColor = g_CustomBottom;
		starColor = g_CustomStar;
	}

	// 1. Sky vertical gradient
	vec3 col = mix(topColor, bottomColor, uv.y);

	// 2. Twinkling stars (aspect-corrected UV)
	vec2 starUV = vec2(uv.x * 1.7778, uv.y);
	float stars = 0.0;
	stars += starLayer(starUV, 28.0, g_StarDensity, g_Time);
	stars += starLayer(starUV + vec2(13.7, 29.1), 42.0, g_StarDensity, g_Time + 1.7);
	col = mix(col, starColor, saturate(stars));

	// 3. Shooting stars (4 independent trails)
	float shoot = 0.0;
	shoot += shootingStar(uv, 1.13, g_Time, g_ShootingSpeed);
	shoot += shootingStar(uv, 2.47, g_Time, g_ShootingSpeed);
	shoot += shootingStar(uv, 3.89, g_Time, g_ShootingSpeed);
	shoot += shootingStar(uv, 5.31, g_Time, g_ShootingSpeed);
	col += starColor * saturate(shoot);

	gl_FragColor = vec4(saturate(col), 1.0);
}

