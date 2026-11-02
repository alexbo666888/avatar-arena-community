// 联系方式公开展示；复制失败时给出可手动复制的文本。
document.querySelectorAll('[data-copy-wechat]').forEach(button=>button.addEventListener('click',async()=>{
  let message='已复制微信：Mc9988889999';
  try{await navigator.clipboard.writeText('Mc9988889999')}catch{message='请手动复制微信：Mc9988889999'}
  document.querySelectorAll('.copy-status').forEach(el=>{el.textContent=message});
}));
