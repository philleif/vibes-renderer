import {Config} from 'remotion';

//Config.Rendering.setImageFormat('jpeg');
Config.Bundling.setCachingEnabled(true);
Config.Rendering.setImageFormat("png");
Config.Output.setPixelFormat("yuva420p");
Config.Output.setCodec("vp8");