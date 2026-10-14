/* Preview: reserve room for the clue and keyboard before sizing the board. */
let compactFrame=0;
function fitCrossword(){
 if(!document.body.classList.contains('game-open'))return;
 const panel=grid.parentElement,mainStyle=getComputedStyle(gameMain);
 const viewportHeight=window.visualViewport?.height||window.innerHeight;
 const wide=matchMedia('(min-width:600px) and (min-height:700px)').matches;
 const css=el=>getComputedStyle(el),num=x=>parseFloat(x)||0;
 let reserved=num(mainStyle.paddingTop)+num(mainStyle.paddingBottom);
 for(const child of gameMain.children){
  const style=css(child);
  if(style.display==='none'||style.position==='fixed')continue;
  reserved+=child.getBoundingClientRect().height+(child.classList.contains('keyboard-panel')?3:num(style.marginTop))+num(style.marginBottom);
 }
 reserved-=grid.getBoundingClientRect().height;
 const panelStyle=css(panel);
 const width=panel.clientWidth-num(panelStyle.paddingLeft)-num(panelStyle.paddingRight);
 const rows=Math.max(7,ROWS.length),cols=Math.max(9,ROWS[0].length),gap=2;
 const minimumBoard=24*rows+gap*(rows-1);
 // Reserve 4% normally; on short screens keep at least 8px before
 // allowing the accessible scrolling fallback. Never clip content.
 const reserve=Math.max(8,Math.min(viewportHeight*.04,viewportHeight-reserved-minimumBoard-8));
 const height=viewportHeight-reserved-reserve-8;
 const cell=Math.min(wide?64:42,(width-gap*(cols-1))/cols,(height-gap*(rows-1))/rows);
 // Tiny screens / older oversized puzzles retain readable cells and accessible scrolling.
 const size=Math.max(24,Math.floor(cell));
 grid.style.width=(size*cols+gap*(cols-1))+'px';
 grid.style.maxWidth='100%';
 grid.dataset.compactFits=cell>=24?'true':'false';
 gameMain.style.minHeight=wide?'0px':Math.floor(viewportHeight-reserve)+'px';
 gameMain.dataset.layout=wide?'wide':'compact';
 grid.dataset.reserve=Math.round(reserve);
 grid.dataset.maximumRows=Math.floor((height+gap)/(24+gap));
 grid.dataset.maximumColumns=Math.floor((width+gap)/(24+gap));
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
