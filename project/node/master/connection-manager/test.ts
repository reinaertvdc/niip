#!/usr/bin/env ts-node

async function test(): Promise<void> {
    console.log(await new Promise<boolean>((resolve,reject)=>{
        resolve(false);
    }));
};

test();

