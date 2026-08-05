/* ================= نمایش پروفایل ================= */
(function(root){
  function normalizeProfileName(name){return String(name||'').trim().slice(0,20)||'فرمانده';}
  function shouldConfirmProfileReplacement(profile){return Boolean(profile);}
  function buildProfileSlotView(profile,slot,missionCount){
    if(!profile)return {slot,empty:true,name:'جایگاه خالی',act:1,progress:0,stars:0,minutes:0,lastMissionId:'M01'};
    const count=Math.max(1,Number(missionCount)||40);
    const unlocked=Math.max(0,Math.min(count-1,Number(profile.unlockedIndex)||0));
    return {slot,empty:false,name:normalizeProfileName(profile.name),act:Math.min(4,Math.floor(unlocked/10)+1),
      progress:Math.round(((unlocked+1)/count)*100),stars:Number(profile.stars)||0,
      minutes:Math.floor((Number(profile.playSeconds)||0)/60),lastMissionId:profile.lastMissionId||'M01'};
  }
  root.ProfileViewModel={normalizeProfileName,shouldConfirmProfileReplacement,buildProfileSlotView};
})(globalThis);
