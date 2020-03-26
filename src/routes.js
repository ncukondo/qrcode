import QRMaker from "./components/QRMaker.svelte";
import QRCapture from "./components/QRCapture.svelte";
import QRCamera from "./components/QRCamera.svelte";
import {
  querystring
} from "svelte-spa-router";
import { derived } from 'svelte/store';

const routes = {
  '/': QRMaker,
  '/capture': QRCapture,
  '/camera': QRCamera
}

const params$ = derived(querystring, $querystring => {
  const urlParams = new URLSearchParams($querystring);
  return [...urlParams].reduce((stack, [key, value]) => ({ ...stack, [key]: value })
    , {})
});

export default routes;
export { params$ };
