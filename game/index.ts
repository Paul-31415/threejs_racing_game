//
//import * as PIXI from "pixi.js";
import * as THREE from "three";
import { World } from "nova_ecs/world";
import { TimePlugin, TimeResource } from "nova_ecs/plugins/time_plugin";
import { Resource } from "nova_ecs/resource";
import { Component } from "nova_ecs/component";
import { Provide } from "nova_ecs/provider";
import { System } from "nova_ecs/system";
import { EcsEvent } from "nova_ecs/events";
import { Emit } from "nova_ecs/arg_types";
import { InputPlugin, keyboardState, mousemove, wheel } from "./input";
import { Entity, EntityBuilder } from "nova_ecs/entity";

console.log('hello');

//from getting started in the docs
var fov = 75;
let three_scene = new THREE.Scene();
let three_renderer = new THREE.WebGLRenderer({ alpha: false });
three_renderer.setSize(window.innerWidth, window.innerHeight);
three_renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);


three_scene.add(new THREE.AmbientLight(0x101010));

for (let i = 0; i < 4; i++) {
    const l = new THREE.DirectionalLight([0xffffff, 0xaabbcc, 0x882255, 0x885533][i],
        [1, .5, .4, .3][i]);


    l.position.x = [2, -4, 13, 10][i];
    l.position.z = [9, -3, -9, -9][i];
    l.position.y = [1, -2, 10, -2][i];

    three_scene.add(l);
}






//let pixi_renderer = PIXI.autoDetectRenderer({ transparent: true });

// const app: PIXI.Application = new PIXI.Application(
//     {
//         width: window.innerWidth,
//         height: window.innerHeight,
//         backgroundColor: 0x000000,
//         transparent: true,
//         resolution: window.devicePixelRatio || 1,
//         // autoResize: true
//     }
// );

var saveDirectory = "./saves/";

three_renderer.domElement.id = "three";
//app.view.id = "pixi";
document.body.appendChild(three_renderer.domElement);
//document.body.appendChild(app.view);


//app.stage.addChild(view);



//const fpsMeter = new PIXI.Text("FPS:__");

//fpsMeter.y = 20;
//fpsMeter.x = 20;

//app.stage.addChild(fpsMeter);

// var oldTime = 0;
// var fps = 0;
// var fpsa = 0.01;
// var spf = 0;
// var spfa = .01;
// function physLoop(delta: number): void {
//     //time += delta;
//     //ctlr.physics(delta);
//     fps = fps * (1 - fpsa) + (60 / delta) * fpsa;
//     fpsMeter.text = "FPS:" + fps;
// }


//test terrain

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



function x_sdf(x: number, y: number, l: number): number {
    x = Math.abs(x);
    y = Math.abs(y);
    const m = Math.min(x + y, l) / 2;
    return Math.hypot(x - m, y - m);
}
const track_radius = 120;
const road_width = 5;

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

const ter = function(x: number, y: number): number {
    let v = 0;
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

const tcol = function(x: number, y: number): THREE.Color {
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
{
    const b = new THREE.BufferGeometry()
    const pts: THREE.Vector3[] = [];
    /*for (let x = -100; x <= 100; x++) {
        for (let y = -100; y <= 100; y++) {
            const z1 = ter(x, y);
            const z2 = ter(x + 1, y);
            const z3 = ter(x, y + 1);
            const z4 = ter(x + 1, y + 1);
            pts.push(new THREE.Vector3(x, y, z1),
                new THREE.Vector3(x + 1, y, z2),
                new THREE.Vector3(x, y + 1, z3),
                new THREE.Vector3(x, y + 1, z3),
                new THREE.Vector3(x + 1, y, z2),
                new THREE.Vector3(x + 1, y + 1, z4));
        }
    }*/
    const start = performance.now();

    const rd = 1000;
    const rn = 1 / 16;
    const aangle = 2 * Math.PI / 1024.5;
    const near_res = 1 / 4;
    const res_transition_dist = 32;
    const angular_resolution = function(r: number): number {
        //want something that gracefully transitions from 1/r to 1
        //return Math.pow(r / near_res, Math.min(0, r / res_transition_dist - 1)) * aangle;
        //old version
        return Math.max(aangle, near_res / r);
    }
    // 2π/angle steps per circle, want mag^steps = 1+angle
    // so mag = e^(log1p(angle)/steps)
    let angle = angular_resolution(rn);
    let mag = Math.exp(angle * Math.log1p(angle) / 2 / Math.PI);
    let mat = [mag * Math.cos(angle), -mag * Math.sin(angle), mag * Math.sin(angle), mag * Math.cos(angle)];

    //spiral terrain		
    const oldps: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
        const x = [0, -1, 0, 1][i] * rn;
        const y = [-1, 0, 1, 0][i] * rn;
        oldps.push(new THREE.Vector3(x, y, ter(x, y)));
    }
    pts.push(oldps[3], oldps[1], oldps[0],
        oldps[1], oldps[3], oldps[2]);
    let pi = 0;

    for (let p = new THREE.Vector2(rn, rn); p.lengthSq() < rd * rd; p.set(p.x * mat[0] + p.y * mat[2], p.x * mat[1] + p.y * mat[3])) {
        angle = angular_resolution(p.length());
        mag = Math.exp(angle * Math.log1p(angle) / 2 / Math.PI);
        mat = [mag * Math.cos(angle), -mag * Math.sin(angle), mag * Math.sin(angle), mag * Math.cos(angle)];

        const z = ter(p.x, p.y);
        const prev = oldps[oldps.length - 1];
        const cur = new THREE.Vector3(p.x, p.y, z);
        let old = oldps[pi];
        //let next = oldps[pi + 1];
        oldps.push(cur);
        while ((old.x * mat[0] + old.y * mat[2]) * cur.y - (old.x * mat[1] + old.y * mat[3]) * cur.x < 0) {
            let next = oldps[++pi];
            pts.push(old, next, prev);
            //console.log("adding inner triangle:");
            //console.log({ a: old, b: next, c: prev });
            old = next;
            if (next === undefined) {
                throw next;
            }
        }
        //console.log("adding outer triangle:");
        //console.log({ a: prev, b: old, c: cur });
        pts.push(prev, old, cur);
    }
    b.setFromPoints(pts);
    b.computeVertexNormals();
    const end = performance.now();
    console.log("added " + (pts.length / 3) + " triangles. time:" + (end - start));

    const material = new THREE.MeshStandardMaterial({ vertexColors: true });
    console.log("coloring triangles");
    const count = b.attributes.position.count;
    b.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    for (let i = 0; i < count; i++) {
        const col = tcol(b.attributes.position.getX(i), b.attributes.position.getY(i));
        b.attributes.color.setXYZ(i, col.r, col.g, col.b);
    }

    const grund = new THREE.Mesh(b, material);
    three_scene.add(grund);
}





//ecs stuff
const world = new World();
(window as any).world = world;
world.addPlugin(TimePlugin);
world.addPlugin(InputPlugin);


const SceneResource = new Resource<THREE.Scene>({ name: "scene", });

world.resources.set(SceneResource, three_scene);

const Obj3dComponent = new Component<THREE.Object3D>({ name: "object" });
world.resources.set(SceneResource, three_scene);

const CubeProvider = Provide({
    args: [SceneResource],
    factory: (s) => {
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        var cube = new THREE.Mesh(geometry, material);
        s.add(cube);
        return cube;
    },
    provided: Obj3dComponent,
});

const CubeSpinny = new System({
    name: "speen",
    args: [TimeResource, CubeProvider, keyboardState] as const,
    step: (t, c, k) => {
        c.applyQuaternion(new THREE.Quaternion(.003, .001 + (k.has('w') ? .3 : 0), .002, .999).normalize());
    }
});
//world.addSystem(CubeSpinny);

const CubeESpinny = new System({
    name: "speeen",
    events: [wheel],
    args: [TimeResource, CubeProvider, wheel, Emit] as const,
    step: (t, c, w, e) => {
        c.applyQuaternion(new THREE.Quaternion(-.03, .06, .02, .99).normalize());
    }
});
//world.addSystem(CubeESpinny);





const freecamMovementComponent = new Component<{
    velocity: THREE.Vector3,
    movespeed: number,
    drag: number,
    enabled: boolean,
}>({ name: "fmc", })
const freecamMovement = new System({
    name: "freecam movement",
    args: [TimeResource, Obj3dComponent, freecamMovementComponent, keyboardState] as const,
    step: (t, o, pmc, k) => {
        //o.rotation.setFromQuaternion(pmc.orientation);

        if (k.has("p")) {
            pmc.enabled = true;
        } if (k.has('o')) {
            pmc.enabled = false;
        }
        if (!pmc.enabled)
            return;
        o.position.addScaledVector(pmc.velocity, t.delta_s);
        pmc.velocity.multiplyScalar(Math.exp(-t.delta_s * pmc.drag));
        let x = new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion);
        let y = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
        let z = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);
        //pmc.frame.extractBasis(x, y, z);
        const speed = pmc.movespeed * (k.has("Control") ? 10 : 1);
        if (k.has('w')) {
            pmc.velocity.addScaledVector(z, -t.delta_s * speed);
        } if (k.has('s')) {
            pmc.velocity.addScaledVector(z, t.delta_s * speed);
        } if (k.has('a')) {
            pmc.velocity.addScaledVector(x, -t.delta_s * speed);
        } if (k.has('d')) {
            pmc.velocity.addScaledVector(x, t.delta_s * speed);
        } if (k.has('Shift')) {
            pmc.velocity.addScaledVector(y, -t.delta_s * speed);
        } if (k.has(' ')) {
            pmc.velocity.addScaledVector(y, t.delta_s * speed);
        } if (k.has('Escape')) {
            document.exitPointerLock();
        } if (k.has('`')) {
            const canvas = document.getElementById('three')
            if (canvas)
                canvas.requestPointerLock();
        }
        const v = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);
        if (k.has('q')) {
            o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, 100).normalize());
        } if (k.has('e')) {
            o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, -100).normalize());
        }

    }
});
world.addSystem(freecamMovement);


const carMovementComponent = new Component<{
    velocity: THREE.Vector3,
    movespeed: number,
    drag: number,
    angularVelocity: THREE.Vector3,
    enabled: boolean,
}>({ name: "cmc", })
const carMovement = new System({
    name: "freecar movement",
    args: [TimeResource, Obj3dComponent, carMovementComponent, keyboardState] as const,
    step: (t, o, pmc, k) => {

        if (k.has("o")) {
            pmc.enabled = true;
        } if (k.has('p')) {
            pmc.enabled = false;
        }
        if (!pmc.enabled)
            return;

        //o.rotation.setFromQuaternion(pmc.orientation);
        o.position.addScaledVector(pmc.velocity, t.delta_s);
        o.applyQuaternion(new THREE.Quaternion(pmc.angularVelocity.x * t.delta_s, pmc.angularVelocity.y * t.delta_s, pmc.angularVelocity.z * t.delta_s, 1).normalize());
        let x = new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion);
        let y = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
        let z = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);
        //pmc.frame.extractBasis(x, y, z);
        const vforward = pmc.velocity.dot(z);
        const speed = pmc.movespeed * (k.has("Control") ? 10 : 1);
        if (k.has('e')) {
            pmc.velocity.addScaledVector(z, -t.delta_s * speed);
        } if (k.has('d')) {
            pmc.velocity.addScaledVector(z, t.delta_s * speed);
        } if (k.has('s')) {
            pmc.angularVelocity.addScaledVector(y, t.delta_s * (1.8 - vforward / 65));
        } if (k.has('f')) {
            pmc.angularVelocity.addScaledVector(y, -t.delta_s * (1.8 - vforward / 65));
        } if (k.has('a')) {
            pmc.angularVelocity.addScaledVector(y, t.delta_s * (0.3 - vforward / 10));
        } if (k.has('g')) {
            pmc.angularVelocity.addScaledVector(y, -t.delta_s * (0.3 - vforward / 10));
        } if (k.has('Shift')) {
            pmc.velocity.addScaledVector(y, -t.delta_s * speed);
        } if (k.has(' ')) {
            pmc.velocity.addScaledVector(y, t.delta_s * speed);
        } if (k.has('Escape')) {
            document.exitPointerLock();
        } if (k.has('`')) {
            const canvas = document.getElementById('three')
            if (canvas)
                canvas.requestPointerLock();
        }

        if (k.has('w')) {
            o.applyQuaternion(new THREE.Quaternion(z.x, z.y, z.z, 100).normalize());
        } if (k.has('r')) {
            o.applyQuaternion(new THREE.Quaternion(z.x, z.y, z.z, -100).normalize());
        }
        pmc.velocity.z -= t.delta_s * 45;
        const tz = ter(o.position.x, o.position.y);
        const eps = 0.001;
        const tzx = ter(o.position.x + eps, o.position.y);
        const tzy = ter(o.position.x, o.position.y + eps);
        if (o.position.z <= tz + 1) {
            const vnforward = pmc.velocity.dot(z);
            const vsideways = pmc.velocity.dot(x);
            const norm = new THREE.Vector3(tz - tzx, tz - tzy, eps).normalize();
            pmc.velocity.addScaledVector(norm, -pmc.velocity.dot(norm));
            pmc.velocity.addScaledVector(x, Math.min(t.delta_s * 1000, Math.max(-t.delta_s * 1000, -vsideways)));
            o.position.z = tz + 1;
            const drag = k.has('b') ? speed * 10 : pmc.drag;
            pmc.velocity.addScaledVector(z, Math.min(drag * t.delta_s, Math.max(-drag * t.delta_s, -vnforward)));

            pmc.angularVelocity.multiplyScalar(Math.exp(-t.delta_s * 10));
            pmc.angularVelocity.addScaledVector(norm.cross(y), -1);
        }
    }
});
world.addSystem(carMovement);



const playerRotate = new System({
    name: "player rotate",
    events: [mousemove],
    args: [Obj3dComponent, freecamMovementComponent, mousemove] as const,
    step: (o, pmc, m) => {
        const v = new THREE.Vector3(-m.movementY, -m.movementX, 0).applyQuaternion(o.quaternion);
        o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, 500).normalize());
    }
});
world.addSystem(playerRotate);


let three_camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
three_camera.position.z = 5;
Obj3dComponent
function makePlayer(): Entity {
    three_camera.rotateX(Math.PI / 2);
    return new EntityBuilder()
        .addComponent(Obj3dComponent, three_camera)
        .addComponent(carMovementComponent, {
            velocity: new THREE.Vector3(0, 0, -0),
            angularVelocity: new THREE.Vector3(0, 0, -0),
            movespeed: 10,
            drag: 0.1,
            enabled: true,
        })
        .addComponent(freecamMovementComponent, {
            enabled: false,
            drag: 10,
            movespeed: 100,
            velocity: new THREE.Vector3(0, 0, 0),
        })
        .build();
}
world.entities.set("player", makePlayer());



window.onresize = function(_event: UIEvent): void {
    //    app.renderer.resize(window.innerWidth, window.innerHeight);
    three_renderer.setSize(window.innerWidth, window.innerHeight);
    three_camera.aspect = window.innerWidth / window.innerHeight;
    three_camera.fov = (three_camera.aspect > 1) ? fov / three_camera.aspect : fov;
    three_camera.updateProjectionMatrix();
};

//app.ticker.add(physLoop);


function animate(time: number) {
    requestAnimationFrame(animate);
    world.step();
    //spf = spf * (1 - spfa) + spfa * (time - oldTime) / 1000;
    //fpsMeter.text = "time:" + (time / 1000).toFixed(6) + "\nfps:" + (1000 / (time - oldTime)).toFixed(2) + "\navgFps:" + (1 / spf).toFixed(2);

    //if (three_camera.userData.eye_sep == 0 && three_camera.userData.eye_overlap == 0) {
    three_renderer.render(three_scene, three_camera);
    /* } else {
         perspRender();
     }*/
    //oldTime = time;

}
animate(0);
