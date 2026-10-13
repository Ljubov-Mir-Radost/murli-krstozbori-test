/* Preview: reserve room for the clue and keyboard before sizing the board. */
let compactFrame=0;
function fitCrossword(){
 if(!document.body.classList.contains('game-open'))return;
 const panel=grid.parentElement,mainStyle=getComputedStyle(gameMain);
 const viewportHeight=window.visualViewport?.height||window.innerHeight;
 const css=el=>getComputedStyle(el),num=x=>parseFloat(x)||0;
 let reserved=num(mainStyle.paddingTop)+num(mainStyle.paddingBottom);
 for(const child of gameMain.children){
  const style=css(child);
  if(style.display==='none'||style.position==='fixed')continue;
  reserved+=child.getBoundingClientRect().height+num(style.marginTop)+num(style.marginBottom);
 }
 reserved-=grid.getBoundingClientRect().height;
 const panelStyle=css(panel);
 const width=panel.clientWidth-num(panelStyle.paddingLeft)-num(panelStyle.paddingRight);
 const rows=ROWS.length,cols=ROWS[0].length,gap=2;
 const height=Math.min(viewportHeight*.4,viewportHeight-reserved-8);
 const cell=Math.min(42,(width-gap*(cols-1))/cols,(height-gap*(rows-1))/rows);
 // Tiny screens / older oversized puzzles retain readable cells and accessible scrolling.
 const size=Math.max(24,Math.floor(cell));
 grid.style.width=(size*cols+gap*(cols-1))+'px';
 grid.style.maxWidth='100%';
 grid.dataset.compactFits=cell>=24?'true':'false';
}
function scheduleCompactFit(){
 cancelAnimationFrame(compactFrame);compactFrame=requestAnimationFrame(fitCrossword);
}
const compactObserver=new ResizeObserver(scheduleCompactFit);
for(const selector of ['.current','.keyboard-panel','.grid-tools','#status']){
 const element=document.querySelector(selector);if(element)compactObserver.observe(element);
}
window.addEventListener('resize',scheduleCompactFit);
window.visualViewport?.addEventListener('resize',scheduleCompactFit);
