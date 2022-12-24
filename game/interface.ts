import * as THREE from "three";
import { burning_ship, czFracHash_julia, czFracHash_julia_smooth, czFracHash_julia_tri, czFracHash_l, czFracHash_mod, czFracHash_smooth, foam, foamhash_dist, foamhash_smooth, mandelbrott, mandelhash, mandelhash_smooth } from "./position_hashes.js";

const rrca = function(x: number): number {
    return ((x & 0xff) >> 1) | ((x & 1) << 7);
}
const rand16 = function(s: number): number {
    let a = s & 0xff;
    let b = (s >> 8) & 0xff;
    b = (rrca((a ^ 0xff) - 1) + b) & 0xff;
    a = ((b - a) ^ 162) & 0xff;
    return a | (b << 8);
}
const poshash = function(x: number, y: number) {
    let v = ((x & 0xff) << 8) | (y & 0xff);
    for (let i = 0; i < 4; i++) {
        v = rand16(v);
    }
    return v;
}
const lposhash = function(x: number, y: number) {
    const v = poshash(x, y);
    const vx = poshash(x + 1, y);
    const vy = poshash(x, y + 1);
    const vxy = poshash(x + 1, y + 1);
    const ax = ((x % 1) + 1) % 1;
    const ay = ((y % 1) + 1) % 1;
    return (v * (1 - ax) + ax * vx) * (1 - ay) + ay * (vy * (1 - ax) + ax * vxy);
}



export function x_sdf(x: number, y: number, l: number): number {
    x = Math.abs(x);
    y = Math.abs(y);
    const m = Math.min(x + y, l) / 2;
    return Math.hypot(x - m, y - m);
}
const track_radius = 120;
const road_width = 15;

const road_sdf = function(x: number, y: number): number {
    x = Math.abs(x);
    y = Math.abs(y);
    const arcx = track_radius * Math.SQRT2;
    if (x + y > arcx) {
        const r = Math.hypot(x - arcx, y);
        return Math.abs(r - track_radius) - road_width;
    }
    return Math.abs(x - y) * Math.SQRT1_2 - road_width;
}
const road_stripe_df = function(x: number, y: number): number {
    const arcx = track_radius * Math.SQRT2;
    return Math.abs(x) * Math.SQRT2 - Math.atan2(Math.abs(y), Math.abs(x) - arcx);
}


export const terrains = new Map<string,((x:number,y:number)=>number)>();

const hash00 = lposhash(0,0);
export const ter1 = function(x: number, y: number): number {
    let v = 0;//((lposhash(x * 0.001, y * 0.001)-hash00) / 32768) * 150;
    for (let i = 0.01; i < 3; i *= 2.1) {
        v += (lposhash(x * i, y * i) / 32768 - 1) * .01 / Math.pow(i, 1.6);
    }
    const arcx = track_radius * Math.SQRT2;
    x = Math.abs(x);
    const x2 = x * x / track_radius / track_radius;
    const y2 = y * y / track_radius / track_radius;
    const cone = Math.hypot(x - arcx, y) - track_radius + road_width * .25;
    const roadHeight = cone * x2 / 8;//(.5 + .5 * Math.tanh(x2 - .5)) * ((x - arcx) * (x - arcx) + y * y) / track_radius / track_radius * 32 - x2 * 2 - y2 * 1;
    const road_lerp = .5 + .5 * Math.tanh(road_sdf(x, y) / road_width * 4 - 1);
    const terrain_amplitude = 5 * (.5 + .5 * Math.tanh(Math.pow(Math.hypot(x, y) / track_radius, .5) - 2));
    return terrain_amplitude * v * (road_lerp) + (1 - road_lerp) * roadHeight;
}
terrains.set("ter1",ter1);
export const tcol = function(x: number, y: number): THREE.Color {
    let croad = road_sdf(x, y);
    let aroad = road_stripe_df(x, y);
    const c = new THREE.Color();
    if (croad + road_width < .25) {
        if ((((aroad % 30) + 30) % 30) > 15) {
            return c.setRGB(1, 1, .5);
        }
    }
    if (Math.abs(croad + road_width * .25) < .25) {
        return c.setRGB(1, 1, .5);
    }
    const l = (1 + Math.tanh(croad)) / 2
    return c.setRGB(.2 + .3 * l, .2 + .3 * l, .2 + .3 * l);
}

//figure-8 course
function course(x:number,y:number,v:number):number{
    const arcx = track_radius * Math.SQRT2;
    x = Math.abs(x);
    const x2 = x * x / track_radius / track_radius;
    const y2 = y * y / track_radius / track_radius;
    const cone = Math.hypot(x - arcx, y) - track_radius + road_width * .25;
    const roadHeight = cone * x2 / 8;//(.5 + .5 * Math.tanh(x2 - .5)) * ((x - arcx) * (x - arcx) + y * y) / track_radius / track_radius * 32 - x2 * 2 - y2 * 1;
    const road_lerp = .5 + .5 * Math.tanh(road_sdf(x, y) / road_width * 4 - 1);
    const terrain_amplitude = 5 * (.5 + .5 * Math.tanh(Math.pow(Math.hypot(x, y) / track_radius, .5) - 2));
    return terrain_amplitude * v * (road_lerp) + (1 - road_lerp) * roadHeight;
}


//fossils
export const ter_fossils = function(x: number, y: number): number {
    let v = [0,0];//mandelhash_smooth(x*0.01,y*0.01,4)[1];
    let iter = 1
    for (let i = 0.01; i < 3; i *= 2.1) {
        const r = mandelhash_smooth(x * i/10, y * i/10,iter);
        v[0] += r[0] * .01 / Math.pow(i, 1.6);
        v[1] += r[1] * .01 / Math.pow(i, 1.6);
        if (iter < 4){iter ++;}
    }
    return course(x,y,v[0])
}
terrains.set("fossils",ter_fossils);
//sand dunes
export const ter_dunes = function(x: number, y: number): number {
    let v = czFracHash_julia_tri(x/1000,y/1000,x/1000,y/1000,mandelbrott,8,1);
    return course(x,y,v[0]);
}
terrains.set("dunes",ter_dunes);



export const ter = function(x: number, y: number): number {
    //let v = czFracHash_l(x/300,y/300,mandelbrott,16,4);
    //return course(x,y,v);
    
    //let v = czFracHash_julia_smooth(x/1000,y/1000,-.125,.25,foam,2,16);
    //v = czFracHash_julia(v[0]/16,v[1]/16,-.125,.25,foam,5);
    //let d = foamhash_dist(x/1000,y/1000,x/1000,y/1000,7);
    //let d = Math.abs(mandelhash_smooth(x*0.01,y*0.01,4)[1]);
    //let v = czFracHash_julia(x,y,-.125,.25,foam,7);
    //let v = [x,y];
    /*let v = [0,0];
    let iter = 1
    for (let i = 0.01; i < 3; i *= 2.1) {
        const r = mandelhash_smooth(x * i/10, y * i/10,iter);
        v[0] += r[0] * .01 / Math.pow(i, 1.6);
        v[1] += r[1] * .01 / Math.pow(i, 1.6);
        if (iter < 4){iter ++;}
        }*/
    let v = czFracHash_julia_tri(x/1000,y/1000,x/1000,y/1000,mandelbrott,8,1);
    return course(x,y,(v[0]*v[0]+v[1]*v[1])**0.5);//Math.tanh(v[0]*v[0]+v[1]*v[1]-4));//10/(v[0]*v[0]+v[1]*v[1]+1));
}



export type MeshWorker = {spiral_raster_geometry:(terkey:string,pos:{x:number,y:number,z:number}) => Promise<any[]>};//Promise<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>};
