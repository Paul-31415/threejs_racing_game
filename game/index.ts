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
{
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
    const ter = function(x: number, y: number): number {
        let v = 0;
        for (let i = 0.03; i < 3; i *= 2) {
            v += (poshash(x * i, y * i) / 32768 - 1) * .01 / i;
        }
        return 10 * v;
    }

    const b = new THREE.BufferGeometry()
    const pts: THREE.Vector3[] = [];
    for (let x = -100; x <= 100; x++) {
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
    }
    b.setFromPoints(pts);
    b.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
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





const playerMovementComponent = new Component<{
    velocity: THREE.Vector3,
    movespeed: number,
    drag: number,
}>({ name: "pmc", })
const playerMovement = new System({
    name: "player movement",
    args: [TimeResource, Obj3dComponent, playerMovementComponent, keyboardState] as const,
    step: (t, o, pmc, k) => {
        //o.rotation.setFromQuaternion(pmc.orientation);
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
world.addSystem(playerMovement);


const playerRotate = new System({
    name: "player rotate",
    events: [mousemove],
    args: [Obj3dComponent, playerMovementComponent, mousemove] as const,
    step: (o, pmc, m) => {
        const v = new THREE.Vector3(-m.movementY, -m.movementX, 0).applyQuaternion(o.quaternion);
        o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, 1000).normalize());
    }
});
world.addSystem(playerRotate);


let three_camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
three_camera.position.z = 5;
Obj3dComponent
function makePlayer(): Entity {
    return new EntityBuilder()
        .addComponent(Obj3dComponent, three_camera)
        .addComponent(playerMovementComponent, {
            velocity: new THREE.Vector3(0, 0, -0.1),
            movespeed: 100,
            drag: 10,
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
