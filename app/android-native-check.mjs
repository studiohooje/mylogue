import {connect} from './qa-cdp.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const c=await connect(9237);
try {
  const result=await c.run(`(async()=>{
    const bridge=await import('./native-auth.js');
    const {cloudState}=await import('./cloud-sync.js');
    const {storageAccount}=await import('./storage-scope.js');
    const available=bridge.nativeAuthAvailable();
    // Read-only native method proves the Java bridge resolves, without starting authentication.
    const native=available?await (await import('./vendor/capacitor/core.js')).registerPlugin('FirebaseAuthentication').getCurrentUser():null;
    return {platform:Capacitor.getPlatform(),nativeAuthAvailable:available,nativeBridgeResponded:!!native,
      nativeUserPresent:!!native?.user,jsUserPresent:!!cloudState.user,configured:cloudState.configured,
      cloudError:cloudState.error,guestScope:storageAccount()==='',
      sdkLocal:!!(await fetch('./vendor/firebase/firebase-auth.js')).ok};
  })()`);
  assert.equal(result.platform,'android');assert.equal(result.nativeAuthAvailable,true);
  assert.equal(result.nativeBridgeResponded,true);assert.equal(result.configured,true);
  assert.equal(result.cloudError,'');assert.equal(result.sdkLocal,true);
  assert.equal(result.nativeUserPresent,false);assert.equal(result.jsUserPresent,false);assert.equal(result.guestScope,true);
  await fs.mkdir('qa',{recursive:true});
  await fs.writeFile('qa/android-native-v4.json',JSON.stringify({scope:'Read-only emulator; no personal login; native bridge and Firebase init only',...result},null,2));
  console.log('PASS Android native bridge, Firebase configuration, local SDK and guest account initialization; personal login not attempted');
}finally{c.close()}

