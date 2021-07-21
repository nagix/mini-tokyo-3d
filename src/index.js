import {Marker} from 'mapbox-gl';
import MiniTokyo3D from './mini-tokyo-3d';
import Panel from './panel';
import Plugin from './plugins/plugin';
import Popup from 'mapbox-gl-animated-popup';
import ThreeLayer from './three-layer';
import {TextureLoader, MeshPhongMaterial} from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader';
import './css/loaders.scss';
import './css/mini-tokyo-3d.css';

export default {Marker, MiniTokyo3D, Panel, Plugin, Popup, ThreeLayer, TextureLoader, MeshPhongMaterial, GLTFLoader};
