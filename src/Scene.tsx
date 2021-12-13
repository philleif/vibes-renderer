import { getVideoMetadata, VideoMetadata } from '@remotion/media-utils';
import { ThreeCanvas, useVideoTexture } from '@remotion/three';
import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { PerspectiveCamera, GradientTexture, Sky, Plane } from '@react-three/drei'
import { MarchingCubes } from './helpers/MarchingCubes';
import JSONfont from './assets/fonts/Anton_Regular.json';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig, Video, useCurrentFrame, spring, interpolate } from 'remotion';
import { FontLoader } from './helpers/FontLoader';
import { TextGeometry } from './helpers/TextGeometry'
import {
	Canvas,
	extend,
	useFrame,
	useLoader,
	useThree
} from '@react-three/fiber'
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlurPass } from "postprocessing";

extend({ TextGeometry });

let COLOR_START, COLOR_MIDDLE, COLOR_END;
const SPHERE_OPACITY = 0.6;
const AMBIENT_COLOR = 0xffffff;
const DIRECTIONAL_COLOR = 0xffffff;

const container: React.CSSProperties = {
	backgroundColor: 'white',
};

const videoStyle: React.CSSProperties = {
	position: 'absolute',
	opacity: 0,
};

function reduceFontSize(text) {
	const loader = new FontLoader();
	const font = loader.parse(JSONfont);
	let fontSize = 0;
	let textOptions = {
		font: font,
		size: 200,
		height: 20,
		curveSegments: 50,
		bevelThickness: 1,
		bevelSize: 1,
		bevelEnabled: true
	};

	let textGeo = new TextGeometry(text, textOptions);
	textGeo.computeBoundingBox();
	let textSize = textGeo.boundingBox.max.x;


	while (textSize > 360) {
		textOptions.size -= 10;
		textGeo = new TextGeometry(text, textOptions);
		textGeo.computeBoundingBox();
		textSize = textGeo.boundingBox.max.x;
		fontSize = textOptions.size;
	}

	return fontSize;
}

function Background() {
	const geometry = new THREE.CircleGeometry(100, 12);

	return (
		<mesh visible position={[0, 0, 0]} castShadow>
			<circleGeometry attach="geometry" args={[500, 32]} />
			<meshPhysicalMaterial
				attach="material"
				reflectivity={0}
			>
				<GradientTexture
					stops={[0, 0.5, 1]} // As many stops as you want
					colors={[COLOR_START, COLOR_MIDDLE, COLOR_END]} // Colors need to match the number of stops
					size={1024} // Size is optional, default = 1024
				/></meshPhysicalMaterial>
		</mesh>

	)
}

function TextMesh({ text }) {
	// load in font
	const loader = new FontLoader();
	const font = loader.parse(JSONfont);

	// configure font mesh
	let textOptions = {
		font: font,
		size: reduceFontSize(text),
		height: 20,
		curveSegments: 50,
		bevelThickness: 1,
		bevelSize: 1,
		bevelEnabled: true
	};

	const textGeo = new TextGeometry(text, textOptions);
	textGeo.computeBoundingBox();

	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const time = interpolate(
		frame,
		[0, durationInFrames],
		[0, Math.PI * 12]
	);

	textGeo.center();
	textGeo.rotateX(Math.sin(time / 4) * 0.5);

	return (
		<mesh position={[0, 0, 250]}>
			<primitive object={textGeo} attach="geometry" />
			<meshPhysicalMaterial
				attach="material"
				roughness={0}
				metalness={0}
				reflectivity={1}
				color={COLOR_END}
			/>
		</mesh>
	);
}

type lavaProps = {
} & Omit<JSX.IntrinsicElements['mesh'], 'args'>;

const Lava: React.FC<lavaProps> = ({
	children,
	...otherProps
}) => {
	const material = new THREE.MeshPhysicalMaterial({ roughness: 10, metalness: 0, reflectivity: 0, color: new THREE.Color(COLOR_START).convertSRGBToLinear() })

	let resolution = 28;
	let numblobs = 10;
	let effect = new MarchingCubes(resolution, material, true, true, 100000);
	effect.position.set(0, 0, 0);
	effect.scale.set(150, 150, 150);
	effect.isolation = 80;

	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const time = interpolate(
		frame,
		[0, durationInFrames * 4],
		[0, Math.PI * 6]
	);

	const subtract = 8;
	const strength = 2 / ((Math.sqrt(numblobs) - 1) / 4 + 1);

	for (let i = 0; i < numblobs; i++) {
		const ballx = Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.27 + 0.5;
		const bally = Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.77 + 0.1;
		const ballz = Math.cos(i + 1.32 * time * 0.1 * Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5;
		effect.addBall(ballx, bally, ballz, strength, subtract);
	}

	return (
		<primitive object={effect} position={[0, 0, 0]} />
	);
};


function RotatingSphere() {
	return (
		<group
			rotation={[0, 0, 0]}
		>
			<mesh visible position={[0, 0, 0]} castShadow>
				<sphereGeometry attach="geometry" args={[200, 200, 200]} />
				<meshPhysicalMaterial
					attach="material"
					opacity={SPHERE_OPACITY}
					transparent={true}
					roughness={10}
					metalness={0.2}
					reflectivity={0}
				>
					<GradientTexture
						stops={[0, 0.5, 1]} // As many stops as you want
						colors={[COLOR_START, COLOR_MIDDLE, COLOR_END]} // Colors need to match the number of stops
						size={1024} // Size is optional, default = 1024
					/></meshPhysicalMaterial>
			</mesh>
		</group>
	)
}

export const Scene: React.FC<{
	videoSrc: string;
	baseScale: number;
	text: string;
	colorstart: string;
	colormiddle: string;
	colorend: string;
}> = ({ baseScale, videoSrc, text, colorstart, colormiddle, colorend }) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const { width, height } = useVideoConfig();
	const [videoData, setVideoData] = useState<VideoMetadata | null>(null);
	
	console.log(colorend);

	COLOR_START = colorstart;
	COLOR_MIDDLE = colormiddle;
	COLOR_END = colorend;

	useEffect(() => {
		getVideoMetadata(videoSrc)
			.then((data) => setVideoData(data))
			.catch((err) => console.log(err));
	}, [videoSrc]);

	const texture = useVideoTexture(videoRef);

	return (
		<AbsoluteFill style={container}>
			<Video ref={videoRef} src={videoSrc} style={videoStyle} />
			{videoData ? (
				<ThreeCanvas linear width={width} height={height}>
					<PerspectiveCamera makeDefault fov={45} aspect={1} near={1} far={5000} position={[0, 0, 800]} />
					<ambientLight intensity={0.75} color={AMBIENT_COLOR} />
					<directionalLight color={DIRECTIONAL_COLOR} position={[1, 1, 1]} />
					<Suspense fallback={null}>
						<Lava />
						<RotatingSphere />
						<TextMesh text={text} />
						<Background />
					</Suspense>
				</ThreeCanvas>
			) : null}
		</AbsoluteFill>
	);
};
