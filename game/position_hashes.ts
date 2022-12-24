// Hash function from H. Schechter & R. Bridson, goo.gl/RXiKaH
export function Hash_Schechter_Bridson(s:number):number{
    s ^= 2747636419;
    s *= 2654435769;
    s ^= s >> 16;
    s *= 2654435769;
    s ^= s >> 16;
    s *= 2654435769;
    return s;
}//scale: 4294967295

//https://www.shadertoy.com/view/XlGcRh
//https://jcgt.org/published/0009/03/02/paper.pdf
export function pcg2d(v:{x:number,y:number}):{x:number,y:number}
{
    v.x = v.x * 1664525 + 1013904223;
    v.y = v.y * 1664525 + 1013904223;

    v.x += v.y * 1664525;
    v.y += v.x * 1664525;

    v.x = v.x ^ (v.x>>16);
    v.y = v.y ^ (v.y>>16);

    v.x += v.y * 1664525;
    v.y += v.x * 1664525;

    v.x = v.x ^ (v.x>>16);
    v.y = v.y ^ (v.y>>16);

    return v;
}


// http://www.jcgt.org/published/0009/03/02/
export function pcg4d(v={x:0,y:0,z:0,w:0}):{x:number,y:number,z:number,w:number}
{
    v.x = v.x * 1664525 + 1013904223;
    v.y = v.y * 1664525 + 1013904223;
    v.z = v.z * 1664525 + 1013904223;
    v.w = v.w * 1664525 + 1013904223;
    
    v.x += v.y*v.w;
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v.w += v.y*v.z;
    
    v.x ^= v.x >> 16;
    v.y ^= v.y >> 16;
    v.z ^= v.z >> 16;
    v.w ^= v.w >> 16;
    
    v.x += v.y*v.w;
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v.w += v.y*v.z;
    
    return v;
}




//made up hashes section
type p2d = [number,number];
function cadd(a:p2d,b:p2d):p2d{return [a[0]+b[0],a[1]+b[1]];}
function csub(a:p2d,b:p2d):p2d{return [a[0]-b[0],a[1]-b[1]];}
function cmul(a:p2d,b:p2d):p2d{return [a[0]*b[0]-a[1]*b[1],a[1]*b[1]+a[0]*b[1]];}

function tri(v:number):number{return Math.abs(((((v+1)%4)+4)%4)-2)-1;}

export function mandelhash(cx:number,cy:number,iters=3):[number,number]{
    let zx = cx;
    let zy = cy;    
    for (let i = 0; i < iters; i++){
        const zx2 = zx*2;
        zx = ((zx+zy)*(zx-zy)+cx)%2;
        zy = ((zy*zx2)+cy)%2;
    }
    return [zx,zy];
}

export function mandelhash_smooth(cx:number,cy:number,iters=3,s=2):[number,number]{
    let zx = Math.sin(cx/s)*s;
    let zy = Math.sin(cy/s)*s;    
    for (let i = 0; i < iters; i++){
        const zx2 = zx*2;
        zx = Math.sin(((zx+zy)*(zx-zy)+cx)/s)*s;
        zy = Math.sin(((zy*zx2)+cy)/s)*s;
    }
    return [zx,zy];
}


//from return z.prod(z).sum(c.prod(z.mulInverse()));//foam
export function foamhash_smooth(x:number,y:number,cx:number,cy:number,iters=3,s=2):[number,number]{
    let zx = Math.sin(x/s)*s;
    let zy = Math.sin(y/s)*s;    
    for (let i = 0; i < iters; i++){
        // z^2+c/z
        //c/z = cx+i*cy/(zx+i*zy)
        //c*z°/|z|^2
        const zm2 = zx*zx+zy*zy;
        const czx = (zx*cx+zy*cy)/(zm2+1e-150);
        const czy = (zx*cy-zy*cx)/(zm2+1e-150);
        const zx2 = zx*2;
        zx = Math.sin(((zx+zy)*(zx-zy)+czx)/s)*s;
        zy = Math.sin(((zy*zx2)+czy)/s)*s;
    }
    return [zx,zy];
}

export function foamhash_dist(x:number,y:number,cx:number,cy:number,iters=8):number{
    let zx = x;
    let zy = y;
    for (let i = 0; i < iters; i++){
        // z^2+c/z
        //c/z = cx+i*cy/(zx+i*zy)
        //c*z°/|z|^2
        const zm2 = zx*zx+zy*zy;
        const czx = (zx*cx+zy*cy)/(zm2+1e-150);
        const czy = (zx*cy-zy*cx)/(zm2+1e-150);
        const zx2 = zx*2;
        zx = (zx+zy)*(zx-zy)+czx;
        zy = (zy*zx2)+czy;
    }
    return (zx*zx+zy*zy)**0.5;
}


export function mandelbrott(zx:number,zy:number,cx:number,cy:number):[number,number]{
    return [((zx+zy)*(zx-zy)+cx),2*zx*zy+cy];
}
export function burning_ship(zx:number,zy:number,cx:number,cy:number):[number,number]{
    zx = Math.abs(zx);zy = Math.abs(zy);
    return [((zx+zy)*(zx-zy)+cx),2*zx*zy+cy];
}

export function foam(zx:number,zy:number,cx:number,cy:number):[number,number]{
    const zm2 = zx*zx+zy*zy;
    const czx = (zx*cx+zy*cy)/(zm2+1e-150);
    const czy = (zx*cy-zy*cx)/(zm2+1e-150);
    return [((zx+zy)*(zx-zy)+czx),2*zx*zy+czy];
}

type CZFrac = (zx:number,zy:number,cx:number,cy:number)=>[number,number];


export function czFracHash(x:number,y:number,frac:CZFrac,iters=3):[number,number]{
    let zx = x;
    let zy = y;
    for (let i = 0; i < iters; i++){
        [zx,zy] = frac(zx,zy,x,y);
    }
    return [zx,zy];

}
export function czFracHash_l(x:number,y:number,frac:CZFrac,iters=3,bailout2=4):number{
    let px = 0;
    let py = 0;
    let zx = x;
    let zy = y;
    let l = 0;
    for (let i = 0; i < iters; i++){
        if (zx*zx+zy*zy>bailout2){
            return l+(bailout2-(px*px+py*py))/((zx*zx+zy*zy)-(px*px+py*py));
        }
        l++;
        px = zx;
        py = zy;
        [zx,zy] = frac(zx,zy,x,y);
    }
    
    return l;

}

export function czFracHash_mod(x:number,y:number,frac:CZFrac,iters=3,mod=2):[number,number]{
    let zx = x;
    let zy = y;
    for (let i = 0; i < iters; i++){
        [zx,zy] = frac(zx%mod,zy%mod,x,y);
    }
    return [zx%mod,zy%mod];
}

export function czFracHash_smooth(x:number,y:number,frac:CZFrac,iters=3,s=2):[number,number]{
    let zx = x;
    let zy = y;
    for (let i = 0; i < iters; i++){
        [zx,zy] = frac(Math.sin(zx/s)*s,Math.sin(zy/s)*s,x,y);
    }
    return [Math.sin(zx/s)*s,Math.sin(zy/s)*s];
}

export function czFracHash_julia(x:number,y:number,jx:number,jy:number,frac:CZFrac,iters=3):[number,number]{
    for (let i = 0; i < iters; i++){
        [x,y] = frac(x,y,jx,jy);
    }
    return [x,y];
}

export function czFracHash_julia_smooth(x:number,y:number,jx:number,jy:number,frac:CZFrac,iters=3,s=2):[number,number]{
    for (let i = 0; i < iters; i++){
        [x,y] = frac(Math.sin(x/s)*s,Math.sin(y/s)*s,jx,jy);
    }
    return [Math.sin(x/s)*s,Math.sin(y/s)*s];
}

export function czFracHash_julia_tri(x:number,y:number,jx:number,jy:number,frac:CZFrac,iters=3,s=2):[number,number]{
    for (let i = 0; i < iters; i++){
        [x,y] = frac(tri(x/s)*s,tri(y/s)*s,jx,jy);
    }
    return [tri(x/s)*s,tri(y/s)*s];
}
