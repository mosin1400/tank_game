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
  showCampaignMap();
}
function showProfileSelect(){
  state='menu'; document.body.dataset.state='menu'; stopMusic();
  selectedProfileSlot=activeProfileSlot>=0?activeProfileSlot:0;
  showScreen('profileSelect'); renderProfileSlots(); selectProfileSlot(selectedProfileSlot);
}
function renderMenuProfileSlots(){
  const host=document.getElementById('menuProfileSlots'); if(!host)return;
  host.innerHTML='';
  listProfiles().forEach((profile,slot)=>{
    const row=document.createElement('div'); row.className='menu-profile-slot'+(slot===selectedProfileSlot?' selected':'');
    if(!profile){
      row.classList.add('empty'); row.innerHTML=`<div class="menu-profile-empty">جایگاه ${faNum(slot+1)} · خالی <span>+</span></div>`;
      row.addEventListener('click',()=>selectMenuProfile(slot));
    }else{
      const pick=document.createElement('button'); pick.type='button'; pick.className='menu-profile-pick';
      const view=ProfileViewModel.buildProfileSlotView(profile,slot,CAMPAIGN_MISSIONS.length);
      pick.innerHTML=`<b>${view.name}</b><small>پیشروی ${faNum(view.progress)}٪ · ${faNum(view.stars)} ستاره</small>`;
      pick.addEventListener('click',()=>selectMenuProfile(slot));
      const remove=document.createElement('button'); remove.type='button'; remove.className='menu-profile-delete'; remove.title='حذف پروفایل'; remove.textContent='×';
      remove.addEventListener('click',event=>{event.stopPropagation();deleteMenuProfile(slot);});
      row.append(pick,remove);
    }
    host.appendChild(row);
  });
}
function selectMenuProfile(slot){
  if(!Number.isInteger(slot)||slot<0||slot>2)return;
  selectedProfileSlot=slot;
  const profile=listProfiles()[slot];
  const input=document.getElementById('menuProfileName'); if(input)input.value=profile?profile.name:'';
  renderMenuProfileSlots();
}
function createMenuProfile(){
  const slot=listProfiles().findIndex(profile=>!profile);
  if(slot<0){showMsg('هر سه جایگاه پروفایل پر است؛ یکی را حذف کنید.',2600);return;}
  const input=document.getElementById('menuProfileName');
  replaceProfile(slot,ProfileViewModel.normalizeProfileName(input&&input.value));
  selectMenuProfile(slot);
}
function renameMenuProfile(){
  if(!listProfiles()[selectedProfileSlot]){showMsg('ابتدا یک پروفایل بسازید.',2200);return;}
  const input=document.getElementById('menuProfileName');
  renameProfile(selectedProfileSlot,ProfileViewModel.normalizeProfileName(input&&input.value));
  selectMenuProfile(selectedProfileSlot);
}
function deleteMenuProfile(slot){
  const profile=listProfiles()[slot]; if(!profile)return;
  if(!confirm(`پروفایل «${profile.name}» و پیشرفت آن حذف شود؟`))return;
  deleteProfile(slot);
  const next=listProfiles().findIndex(Boolean);
  selectMenuProfile(next>=0?next:0);
}
function continueMenuProfile(){
  if(!loadProfile(selectedProfileSlot)){showMsg('یک پروفایل بسازید یا انتخاب کنید.',2200);return;}
  showCampaignMap();
}
function initProfileUI(){
  if(profileUiReady)return true;
  const ids=['btnProfileContinue','btnProfileNew','btnProfileConfirmReplace','btnProfileCancelReplace'];
  const elements=ids.map(id=>document.getElementById(id));
  if(elements.some(element=>!element)){console.warn('رابط پروفایل در HTML بارگذاری‌شده وجود ندارد.');return false;}
  profileUiReady=true;
  const [continueButton,newButton,confirmButton,cancelButton]=elements;
  continueButton.addEventListener('click',continueSelectedProfile);
  newButton.addEventListener('click',createSelectedProfile);
  confirmButton.addEventListener('click',confirmProfileReplacement);
  cancelButton.addEventListener('click',()=>{
    pendingReplacementSlot=-1; document.getElementById('profileConfirm').hidden=true;
  });
  return true;
}
