import '../src/profile/profile-view-model.js';

const {buildProfileSlotView,normalizeProfileName,shouldConfirmProfileReplacement}=globalThis.ProfileViewModel;
function assert(condition,message){if(!condition)throw new Error(message);}

const empty=buildProfileSlotView(null,1,40);
assert(empty.slot===1&&empty.empty===true&&empty.progress===0,'empty slot view is incorrect');

const used=buildProfileSlotView({name:'آذر',unlockedIndex:19,stars:30,playSeconds:3661,lastMissionId:'M20'},0,40);
assert(used.name==='آذر'&&used.act===2&&used.progress===50&&used.minutes===61,'used slot summary is incorrect');
assert(normalizeProfileName('   ')==='فرمانده','blank profile name should use default');
assert(normalizeProfileName('  فرمانده سرو  ')==='فرمانده سرو','profile name should be trimmed');
assert(shouldConfirmProfileReplacement({name:'آذر'})===true,'used slot must require confirmation');
assert(shouldConfirmProfileReplacement(null)===false,'empty slot must not require confirmation');

console.log('PASS: profile view model behavior');
