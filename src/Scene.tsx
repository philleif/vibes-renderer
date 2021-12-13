import {getVideoMetadata, VideoMetadata} from '@remotion/media-utils';
import {ThreeCanvas, useVideoTexture} from '@remotion/three';
import React, {useEffect, useRef, useState, useMemo, Suspense} from 'react';
import { PerspectiveCamera, GradientTexture, Sky, Plane } from '@react-three/drei'
import { MarchingCubes } from './helpers/MarchingCubes';
import JSONfont from './assets/fonts/Anton_Regular.json';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig, Video, useCurrentFrame, spring, interpolate } from 'remotion';
import {FontLoader} from './helpers/FontLoader';
import { TextGeometry } from './helpers/TextGeometry'
import { Canvas,
  extend,
  useFrame,
  useLoader,
  useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlurPass } from "postprocessing";

extend({ TextGeometry });

const colors = [
	['#00FFFF', '#FF0000', '#FFFFFF'],
	['#CDFFFF', '#C21900', '#82E585'],
	['#2C00C0', '#FF0100', '#3A00FF'],
	['#000000', '#FF0000', '#FFFFFF'],
	['#000000', '#0000FF', '#FFFFFF'],
	['#FF95FF', '#FF95FF', '#FF0095'],
	['#DC6032', '#952C5A', '#FFD600'],
	['#000000', '#000000', '#3DFF00'],
	['#1188DD', '#1188DD', '#FFFFFF'],
	['#000000', '#00FFFF', '#FFFFFF'],
	['#000000', '#0000FF', '#00FF00'],
	['#AEBCBC', '#00E0E0', '#E0519D'],
	['#5208E7', '#8CA5E7', '#317B00'],
	['#FF0000', '#000000', '#FF0000'],
	['#4658B0', '#FFFFFF', '#35237B'],
	['#F35C22', '#0B2B41', '#114567'],
	['#44CCEE', '#EE9988', '#44CCEE'],
	['#0033FF', '#0088FF', '#FFFFFF'],
	['#000000', '#13396F', '#91E1FC'],
	['#FFFFFF', '#0000FF', '#FF00FF'],
	['#B4B4B4', '#0000D8', '#FF0000'],
	['#00C4C8', '#000000', '#0000C8'],
	['#640504', '#FFFF00', '#640504'],
	['#FFFFFF', '#000000', '#FFFFFF'],
	['#FF0000', '#FFFF00', '#000000'],
]

function getRandomColor() {
	return colors[Math.floor(Math.random() * colors.length)];
}

const SPHERE_COLOR_START = getRandomColor()[0];
const SPHERE_COLOR_MIDDLE = getRandomColor()[1];
const SPHERE_COLOR_END = getRandomColor()[2];
const SPHERE_OPACITY = 0.6;
const TEXT_COLOR = SPHERE_COLOR_END;
const BACKGROUND_COLOR = 0x000000;
const SKY_COLOR = 0xffffff;
const GROUND_COLOR = 0xffffff;
const BUBBLE_COLOR = SPHERE_COLOR_MIDDLE;
const AMBIENT_COLOR = 0xffffff;
const FOG_COLOR = 0xffffff;
const POINT_COLOR = 0xffffff;
const DIRECTIONAL_COLOR = 0xffffff;

const container: React.CSSProperties = {
	backgroundColor: 'white',
};

const videoStyle: React.CSSProperties = {
	position: 'absolute',
	opacity: 0,
};

function Background() {
	const geometry = new THREE.CircleGeometry( 500, 32 );
	const circle = new THREE.Mesh( geometry );

	return (
		<mesh visible position={[0, 0, 0]} castShadow>
				<circleGeometry attach="geometry" args={[500, 32]} />
				<meshPhysicalMaterial
					attach="material"
					reflectivity={0}
				>
				<GradientTexture
					stops={[0, 0.5, 1]} // As many stops as you want
					colors={[SPHERE_COLOR_START, SPHERE_COLOR_MIDDLE, SPHERE_COLOR_END]} // Colors need to match the number of stops
					size={1024} // Size is optional, default = 1024
				/></meshPhysicalMaterial>
				</mesh>

	)
}

function TextMesh({ text }) {
  // load in font
	const loader = new FontLoader();
	const font = loader.parse( JSONfont );
  // configure font mesh
  const textOptions = {
		font: font,
		size: 100,
		height: 20,
		curveSegments: 50,
		bevelThickness: 1,
		bevelSize: 1,
		bevelEnabled: true
	};

	let textGeo = new TextGeometry(text, textOptions )
	
	textGeo.computeBoundingBox()

  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

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
					color={TEXT_COLOR}
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
	const material = new THREE.MeshPhysicalMaterial({ roughness: 10, metalness: 0, reflectivity: 0, color: new THREE.Color(BUBBLE_COLOR).convertSRGBToLinear() })

  let resolution = 28;
  let numblobs = 10;
  let effect = new MarchingCubes(resolution, material, true, true, 100000);
  effect.position.set(0, 0, 0);
  effect.scale.set(150, 150, 150);
  effect.isolation = 80;

  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

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
					colors={[SPHERE_COLOR_START, SPHERE_COLOR_MIDDLE, SPHERE_COLOR_END]} // Colors need to match the number of stops
					size={1024} // Size is optional, default = 1024
				/></meshPhysicalMaterial>
				</mesh>
			</group>
	)
}

function Effects() {
  return (
    <>
      <EffectComposer>
        <Bloom
          intensity={0}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.1}
          blurPass={new BlurPass()}
        />
      </EffectComposer>
    </>
  );
}

export const Scene: React.FC<{
	videoSrc: string;
	baseScale: number;
	text: string;
}> = ({baseScale, videoSrc, text}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const {width, height} = useVideoConfig();
	const [videoData, setVideoData] = useState<VideoMetadata | null>(null);

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
						<Effects />
						<TextMesh text={text} />
						<Background />
					</Suspense>
				</ThreeCanvas>
			) : null}
		</AbsoluteFill>
	);
};
//					<directionalLight color={DIRECTIONAL_COLOR} position={[1, 1, 1]} />
//					<pointLight color={POINT_COLOR} position={[0, 0, 100]} />
//<Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />