import {getVideoMetadata, VideoMetadata} from '@remotion/media-utils';
import {ThreeCanvas, useVideoTexture} from '@remotion/three';
import React, {useEffect, useRef, useState, useMemo, Suspense} from 'react';
import { PerspectiveCamera, GradientTexture, Sky } from '@react-three/drei'
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

const container: React.CSSProperties = {
	backgroundColor: 'white',
};

const videoStyle: React.CSSProperties = {
	position: 'absolute',
	opacity: 0,
};

function TextMesh() {
  // load in font
	const loader = new FontLoader();
	const font = loader.parse( JSONfont );
  // configure font mesh
  const textOptions = {
		font: font,
		size: 60,
		height: 20,
		curveSegments: 50,
		bevelThickness: 2,
		bevelSize: 2,
		bevelEnabled: true
	};

	let textGeo = new TextGeometry("GO OFF QUEEN", textOptions )
	
	textGeo.computeBoundingBox()
	
	const centerOffsetX = - 0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x)
  const centerOffsetY = - 0.5 * (textGeo.boundingBox.max.y - textGeo.boundingBox.min.y)

  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const time = interpolate(
    frame,
    [0, durationInFrames],
    [0, Math.PI * 12]
  );
	
	textGeo.rotateX(Math.sin(time/4) * 0.5);
	
	return (
		<mesh position={[centerOffsetX, centerOffsetY, 200]}>
			<primitive object={textGeo} attach="geometry" />
			<meshPhysicalMaterial
					attach="material"

					roughness={0}
					metalness={.5}
					reflectivity={1}
					color={"#00FFFF"}
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
	const material = new THREE.MeshPhysicalMaterial({ roughness: 0, metalness: 0.5, reflectivity: 1, color: new THREE.Color("#FF00EF").convertSRGBToLinear() })

  let resolution = 28;
  let numblobs = 10;
  let effect = new MarchingCubes(resolution, material, true, true, 100000);
  effect.position.set(0, 0, 0);
  effect.scale.set(100, 100, 100);
  effect.isolation = 80;

  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const time = interpolate(
    frame,
    [0, durationInFrames],
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
				<sphereGeometry attach="geometry" args={[140, 140, 100]} />
				<meshPhysicalMaterial
					attach="material"
					opacity={0.4}
					transparent={true}
					roughness={0}
					metalness={.5}
					reflectivity={1}
				>
				<GradientTexture
					stops={[0, 1]} // As many stops as you want
					colors={['#ffffff', '#fafafa']} // Colors need to match the number of stops
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
          intensity={1}
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
}> = ({baseScale, videoSrc}) => {
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
					<ambientLight intensity={1.5} color={'#FF00EF'} />
					<directionalLight color={0xffffff} position={[0.5, 0.5, 1]} />
					<pointLight color={0xffffff} position={[0, 0, 100]} />
					<Suspense fallback={null}>
						<Lava />
						<RotatingSphere />
						<Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />
						<Effects />
						<TextMesh />
					</Suspense>
				</ThreeCanvas>
			) : null}
		</AbsoluteFill>
	);
};
