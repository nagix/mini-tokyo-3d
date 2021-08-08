import Marker from './marker';
import Map from './map';
import Panel from './panel';
import Plugin from './plugins/plugin';
import Popup from './popup';
import ThreeLayer from './three-layer';
import {TextureLoader, MeshPhongMaterial} from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader';
import './css/loaders.scss';
import './css/mini-tokyo-3d.css';

export default {Marker, Map, Panel, Plugin, Popup, ThreeLayer, TextureLoader, MeshPhongMaterial, GLTFLoader};
