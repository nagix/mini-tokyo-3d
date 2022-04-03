import Marker from './marker';
import Map from './map';
import Panel from './panel';
import Popup from './popup';
import mapboxgl from 'mapbox-gl';
import * as three from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import './css/loaders.scss';
import './css/swiper.scss';
import './css/mini-tokyo-3d.css';

const THREE = Object.assign({GLTFLoader}, three);

export default {
    mapboxgl,
    Marker,
    Map,
    Panel,
    Popup,
    THREE
};
