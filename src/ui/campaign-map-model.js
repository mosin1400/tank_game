/* ================= مدل دادهٔ نقشهٔ کمپین ================= */
(function(root){
  const CAMPAIGN_MAP_POSITIONS=Object.freeze({
    M01:[13.2,89.5],M02:[15.6,87.5],M03:[17.8,86.3],M04:[20.0,84.4],M05:[24.0,86.0],
    M06:[30.0,87.0],M07:[38.0,87.0],M08:[46.0,87.0],M09:[54.0,84.0],M10:[57.0,80.0],
    M11:[55.5,78.8],M12:[57.2,75.5],M13:[58.9,72.0],M14:[61.5,70.2],M15:[63.6,70.0],
    M16:[67.1,67.5],M17:[69.8,66.3],M18:[72.1,64.8],M19:[74.5,63.2],M20:[76.8,61.5],
    M21:[79.0,59.6],M22:[80.8,57.4],M23:[79.8,54.5],M24:[77.8,52.3],M25:[79.4,49.5],
    M26:[81.6,47.8],M27:[82.8,43.0],M28:[83.1,39.9],M29:[81.8,36.3],M30:[83.1,32.5],
    M31:[83.0,28.8],M32:[82.5,25.5],M33:[83.0,22.8],M34:[84.2,20.5],M35:[85.0,18.0],
    M36:[86.8,15.7],M37:[87.7,14.5],M38:[88.6,13.3],M39:[89.5,12.0],M40:[90.4,10.5]
  });
  const WEATHER_LABELS={rain:'باران',mist:'مه',snow:'برف',smoke:'دود',wind:'باد شدید',storm:'طوفان',steam:'بخار',dawn:'سپیده‌دم',dusk:'غروب'};
  const AIR_LABELS={none:'بدون تهدید هوایی',scout:'پرواز شناسایی دشمن',strike:'حملهٔ هوایی دشمن',support:'پشتیبانی محدود خودی'};
  function buildCampaignMapNodes(missions,positions,profile,statusResolver){
    return missions.map((mission,index)=>{
      const point=positions[mission.mapNode]||positions[mission.id];
      if(!point)throw new Error(`مختصات نقشه برای ${mission.id} تعریف نشده است`);
      return {id:mission.id,index,title:mission.title,x:Number(point[0]),y:Number(point[1]),status:statusResolver(mission.id,profile),act:mission.act};
    });
  }
  function buildMissionBriefingView(mission,profile){
    const record=profile&&profile.completed&&profile.completed[mission.id];
    return {id:mission.id,title:mission.title,act:mission.act,story:mission.briefing,
      primary:mission.primaryObjective.label,optional:mission.optionalObjective.label,
      enemies:mission.enemyRoster.join(' · '),weather:WEATHER_LABELS[mission.weather]||mission.weather,
      airWarning:AIR_LABELS[mission.airProfile]||mission.airProfile,reward:mission.reward.label,bestStars:record&&record.stars||0};
  }
  root.CampaignMapModel={CAMPAIGN_MAP_POSITIONS,buildCampaignMapNodes,buildMissionBriefingView};
})(globalThis);
