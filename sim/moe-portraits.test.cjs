const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSourceLoader}=require('./helpers/load-source.cjs');
test('승인된 시안의 불균등한 행에서도 18개 초상화가 구분선을 넘거나 늘어나지 않는다',()=>{
 const {moePortraitCrop}=createSourceLoader()('./moePortraits');
 const rows=[[0,239],[241,476],[479,716],[718,970],[973,1228],[1230,1536]];
 const columns=[[0,342],[345,681],[685,1024]];
 for(let i=0;i<18;i++){
  const {x,y,size}=moePortraitCrop(i,1024,1536);
  const [left,right]=columns[i%3], [top,bottom]=rows[Math.floor(i/3)];
  assert.ok(size>0);
  assert.ok(x>left && x+size<right);
  assert.ok(y>top && y+size<bottom);
 }
});
