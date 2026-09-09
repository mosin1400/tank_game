/* ================= نقشهٔ تعاملی کمپین ================= */
const CAMPAIGN_MAP_IMAGE='assets/images/campaign-map-v3.png';
let campaignMapScale=1,campaignMapDrag=null,campaignMapOffset={x:0,y:0};
const CAMPAIGN_MAP_MARKUP_IDS=['campaignMapViewport','campaignMapImage','campaignNodes','btnMapZoomIn','btnMapZoomOut','btnMapLaunch','btnMapProfiles'];
function isCampaignMapMarkupAvailable(){
  return CAMPAIGN_MAP_MARKUP_IDS.every(id=>document.getElementById(id));
}
function applyCampaignMapTransform(){
  const stage=document.getElementById('campaignMapStage');
  stage.style.transform=`translate(${campaignMapOffset.x}px,${campaignMapOffset.y}px) scale(${campaignMapScale})`;
}
function selectCampaignMapNode(id,focus=false){
  if(getMissionStatus(id,activeProfile)==='locked')return;
  document.querySelectorAll('.map-node').forEach(node=>node.classList.toggle('active',node.dataset.missionId===id));
  renderMissionBriefing(id);
  if(focus){const node=document.querySelector(`[data-mission-id="${id}"]`);if(node)node.focus();}
}
function renderCampaignMap(){
  const host=document.getElementById('campaignNodes');
  if(!host)return false;
  host.innerHTML='';
  const nodes=CampaignMapModel.buildCampaignMapNodes(CAMPAIGN_MISSIONS,CampaignMapModel.CAMPAIGN_MAP_POSITIONS,activeProfile,getMissionStatus);
  nodes.forEach(node=>{
    const button=document.createElement('button'); button.type='button'; button.className='map-node';
    button.classList.add(node.status); button.dataset.missionId=node.id;
    button.style.left=node.x+'%'; button.style.top=node.y+'%'; button.textContent=faNum(node.index+1);
    button.setAttribute('aria-label',`${node.title} · ${node.status==='locked'?'قفل':'در دسترس'}`);
    button.disabled=node.status==='locked'; button.addEventListener('click',()=>selectCampaignMapNode(node.id));
    button.addEventListener('keydown',event=>{
      if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
      event.preventDefault(); const step=event.key==='ArrowLeft'?1:-1;
      const next=nodes[Math.max(0,Math.min(nodes.length-1,node.index+step))];
      if(next.status!=='locked')selectCampaignMapNode(next.id,true);
    });
    host.appendChild(button);
  });
  const preferred=getCampaignMission(activeProfile&&activeProfile.lastMissionId)?activeProfile.lastMissionId:'M01';
  const selectable=getMissionStatus(preferred,activeProfile)==='locked'?'M01':preferred;
  selectCampaignMapNode(selectable);
  return true;
}
function setCampaignMapZoom(delta){
  campaignMapScale=clamp(campaignMapScale+delta,1,1.65); applyCampaignMapTransform();
}
function initCampaignMapUI(){
  if(!isCampaignMapMarkupAvailable()){console.warn('رابط نقشه در HTML بارگذاری‌شده وجود ندارد.');return false;}
  const elements=['campaignMapViewport','campaignMapImage','btnMapZoomIn','btnMapZoomOut','btnMapLaunch','btnMapProfiles'].map(id=>document.getElementById(id));
  const [viewport,image,zoomIn,zoomOut,launchButton,profilesButton]=elements;
  image.src=CAMPAIGN_MAP_IMAGE;
  zoomIn.addEventListener('click',()=>setCampaignMapZoom(.15));
  zoomOut.addEventListener('click',()=>setCampaignMapZoom(-.15));
  launchButton.addEventListener('click',launchSelectedCampaignMission);
  profilesButton.addEventListener('click',showMainMenu);
  viewport.addEventListener('wheel',event=>{event.preventDefault();setCampaignMapZoom(event.deltaY<0?.1:-.1);},{passive:false});
  viewport.addEventListener('pointerdown',event=>{if(campaignMapScale<=1)return;campaignMapDrag={x:event.clientX-campaignMapOffset.x,y:event.clientY-campaignMapOffset.y};viewport.setPointerCapture(event.pointerId);});
  viewport.addEventListener('pointermove',event=>{if(!campaignMapDrag)return;campaignMapOffset.x=event.clientX-campaignMapDrag.x;campaignMapOffset.y=event.clientY-campaignMapDrag.y;applyCampaignMapTransform();});
  const endDrag=()=>{campaignMapDrag=null;}; viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  return true;
}
