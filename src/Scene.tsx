import { getVideoMetadata, VideoMetadata } from '@remotion/media-utils';
import { ThreeCanvas, useVideoTexture } from '@remotion/three';
import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { PerspectiveCamera, GradientTexture, Sky, Plane } from '@react-three/drei'
import { MarchingCubes } from './helpers/MarchingCubes';
import AntonRegular from './assets/fonts/Anton_Regular.json';
import PlayfairDisplay from './assets/fonts/Playfair_Display_Regular.json';
import PtSerif from './assets/fonts/PT_Serif_Bold.json';
import Poppins from './assets/fonts/Poppins_Bold.json';
import ImperialScript from './assets/fonts/Imperial_Script_Regular.json';
import Marker from './assets/fonts/Permanent_Marker_Regular.json';
import AlphaSlab from './assets/fonts/Alfa_Slab_One_Regular.json';
import SecularOne from './assets/fonts/Secular_One_Regular.json';
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
const SPHERE_OPACITY = 1; // 0.6
const AMBIENT_COLOR = 0xffffff;
const DIRECTIONAL_COLOR = 0xffffff;

const container: React.CSSProperties = {
	backgroundColor: 'transparent',
};

const videoStyle: React.CSSProperties = {
	position: 'absolute',
	opacity: 0,
};

const fonts = {
	'anton': AntonRegular,
	'playfair': PlayfairDisplay,
	'pt-serif': PtSerif,
	'poppins': Poppins,
	'imperial': ImperialScript,
	'marker': Marker,
	'alpha-slab': AlphaSlab,
	'secular-one': SecularOne,
}

let fittedFontSize = 0;

function reduceFontSize(text, font) {
	const loader = new FontLoader();

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

	if (fittedFontSize == 0) {
		let textGeo = new TextGeometry(text, textOptions);
		textGeo.computeBoundingBox();
		let textSize = textGeo.boundingBox.max.x;

		while (textSize > 380) {
			textOptions.size -= 10;
			textGeo = new TextGeometry(text, textOptions);
			textGeo.computeBoundingBox();
			textSize = textGeo.boundingBox.max.x;
			fontSize = textOptions.size;
		}

		fittedFontSize = fontSize;
	} else {
		fontSize = fittedFontSize;
	}

	return fontSize;
}

function Background() {
	const geometry = new THREE.CircleGeometry(100, 12);

	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const time = interpolate(
		frame,
		[0, durationInFrames],
		[0, Math.PI * 12]
	);
//			<circleGeometry attach="geometry" args={[500, 32]} />

	return (
		<mesh visible position={[0, 0, 0]} castShadow>
			<boxBufferGeometry attach="geometry" args={[1000, 1528]} />
			<meshPhysicalMaterial
				attach="material"
				reflectivity={0}
			>
				<GradientTexture
					offset={[0, ((frame + 4)/90) - 0.4]} // uncomment this to make the gradient move
					stops={[0, 0.33, 0.66, 1]} // As many stops as you want
					colors={[COLOR_MIDDLE, COLOR_START, COLOR_MIDDLE, COLOR_START]} // Colors need to match the number of stops
					size={764} // Size is optional, default = 1024
				/></meshPhysicalMaterial>
		</mesh>

	)
}

function TextMesh({ text, font }) {
	// load in font
	const loader = new FontLoader();
	const fontFace = loader.parse(fonts[font]);

	// configure font mesh
	let textOptions = {
		font: fontFace,
		size: reduceFontSize(text, fontFace),
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
	textGeo.rotateX(Math.sin(time / 6) * 0.5);

	return (
		<mesh position={[0, 0, 300]}>
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
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const time = interpolate(
		frame,
		[0, durationInFrames],
		[0, Math.PI * 24]
	);

	return (
		<group
			rotation={[0, time/(Math.PI * 4), time/(Math.PI * 4)]}
		>
			<mesh visible position={[0, 0, 0]} castShadow>
				<sphereGeometry attach="geometry" args={[250, 250, 250]} />
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
	font: string;
	colorstart: string;
	colormiddle: string;
	colorend: string;
}> = ({ baseScale, videoSrc, text, colorstart, colormiddle, colorend, font }) => {
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
						<RotatingSphere />
						<TextMesh text={text} font={font} />
						<Background />
					</Suspense>
				</ThreeCanvas>
			) : null}
		</AbsoluteFill>
	);
	};
	//						<Background />
	// 						<Lava />
