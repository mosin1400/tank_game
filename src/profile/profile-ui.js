/* ================= رابط انتخاب پروفایل ================= */
let selectedProfileSlot=0,pendingReplacementSlot=-1,profileUiReady=false;

function profileSlotSummary(view){
  if(view.empty)return `جایگاه ${faNum(view.slot+1)} · خالی`;
  return `پرده ${faNum(view.act)} · پیشروی ${faNum(view.progress)}٪ · ${faNum(view.stars)} ستاره · ${faNum(view.minutes)} دقیقه`;
}
function renderProfileSlots(){
  const host=document.getElementById('profileSlots'); if(!host)return;
  host.innerHTML='';
  listProfiles().forEach((profile,slot)=>{
    const view=ProfileViewModel.buildProfileSlotView(profile,slot,CAMPAIGN_MISSIONS.length);
    const button=document.createElement('button'); button.type='button';
    button.className='profile-slot'+(view.empty?' empty':'')+(slot===selectedProfileSlot?' selected':'');
    button.dataset.slot=String(slot); button.setAttribute('aria-pressed',slot===selectedProfileSlot?'true':'false');
    const number=document.createElement('span'); number.className='profile-slot-number'; number.textContent=faNum(slot+1);
    const copy=document.createElement('span'); copy.className='profile-slot-copy';
    const name=document.createElement('strong'); name.textContent=view.empty?'جایگاه خالی':view.name;
    const meta=document.createElement('small'); meta.textContent=profileSlotSummary(view);
    copy.append(name,meta); button.append(number,copy);
    button.addEventListener('click',()=>selectProfileSlot(slot)); host.appendChild(button);
  });
}
function selectProfileSlot(slot){
  if(!Number.isInteger(slot)||slot<0||slot>2)return;
  selectedProfileSlot=slot; pendingReplacementSlot=-1;
  const profile=listProfiles()[slot];
  if(profile)loadProfile(slot);
  const input=document.getElementById('profileName'); if(input)input.value=profile?profile.name:'';
  const confirm=document.getElementById('profileConfirm'); if(confirm)confirm.hidden=true;
  renderProfileSlots();
  const continueButton=document.getElementById('btnProfileContinue'); if(continueButton)continueButton.disabled=!profile;
}
function createSelectedProfile(){
  const slots=listProfiles(),current=slots[selectedProfileSlot];
  const input=document.getElementById('profileName');
  const name=ProfileViewModel.normalizeProfileName(input&&input.value);
  if(ProfileViewModel.shouldConfirmProfileReplacement(current)){
    pendingReplacementSlot=selectedProfileSlot;
    document.getElementById('profileConfirm').hidden=false;
    document.getElementById('btnProfileConfirmReplace').focus(); return;
  }
  replaceProfile(selectedProfileSlot,name); selectProfileSlot(selectedProfileSlot);
}
function confirmProfileReplacement(){
  if(pendingReplacementSlot<0)return;
  const input=document.getElementById('profileName');
  replaceProfile(pendingReplacementSlot,ProfileViewModel.normalizeProfileName(input&&input.value));
  selectedProfileSlot=pendingReplacementSlot; pendingReplacementSlot=-1; selectProfileSlot(selectedProfileSlot);
}
function continueSelectedProfile(){
  if(!loadProfile(selectedProfileSlot))return;
  showMissions();
}
function showProfileSelect(){
  state='menu'; document.body.dataset.state='menu'; stopMusic();
  selectedProfileSlot=activeProfileSlot>=0?activeProfileSlot:0;
  showScreen('profileSelect'); renderProfileSlots(); selectProfileSlot(selectedProfileSlot);
}
function initProfileUI(){
  if(profileUiReady)return; profileUiReady=true;
  document.getElementById('btnProfileContinue').addEventListener('click',continueSelectedProfile);
  document.getElementById('btnProfileNew').addEventListener('click',createSelectedProfile);
  document.getElementById('btnProfileConfirmReplace').addEventListener('click',confirmProfileReplacement);
  document.getElementById('btnProfileCancelReplace').addEventListener('click',()=>{
    pendingReplacementSlot=-1; document.getElementById('profileConfirm').hidden=true;
  });
  document.getElementById('btnProfileBack').addEventListener('click',showMenu);
  document.getElementById('btnProfiles').addEventListener('click',showProfileSelect);
}
