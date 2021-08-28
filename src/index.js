import Marker from './marker';
import Map from './map';
import Panel from './panel';
import Plugin from './plugin';
import Popup from './popup';
import ThreeLayer from './three-layer';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader';
import './css/loaders.scss';
import './css/mini-tokyo-3d.css';

export default {
    mapboxgl,
    Marker,
    Map,
    Panel,
    Plugin,
    Popup,
    THREE: Object.assign({GLTFLoader}, THREE),
    ThreeLayer
};
