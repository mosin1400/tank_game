# Runtime-first character system — implementation plan

## هدف

جایگزینی مسیر پرهزینهٔ تولید مدل‌های متعدد با یک شخصیت مرد پایهٔ Mixamo-rigged، شش preset اصلی و شانزده preset فرعی. سیستم باید با دارایی واقعی کار کند، بدون fallback به آدم‌های primitive، و تا زمان رسیدن GLB خام قابل تست باشد.

## تصمیم‌های غیرقابل‌مذاکره

- `makehuman-js` و `animouse` نصب نمی‌شوند. اولی AGPL-3.0 و بدون نگهداری فعال است؛ دومی لازم نیست زیرا `THREE.AnimationMixer` نیازها را پوشش می‌دهد.
- همهٔ شخصیت‌ها مرد هستند و هیچ نماد سیاسی/نظامی واقعی ندارند.
- یک GLB پایهٔ rigged و یک کتابخانهٔ هفت حرکت Mixamo برای همهٔ ۲۲ نقش مشترک است.
- ۶ شخصیت اصلی: فرماندهٔ بازیکن، رامین، سامان، نیکان، شاهین تالی، ژنرال وارن.
- ۱۶ شخصیت فرعی: آراد، مهراز، سروش، مهران، نادر، شش سرباز و پنج نقش عمومی.
- نبود دارایی پایه خطای واضح بارگذاری است؛ primitive fallback ممنوع است.

## دارایی دستی موردنیاز از کاربر

یک FBX پایهٔ مرد از MakeHuman و پس از Auto-Rig در Mixamo، این هفت حرکت: `Idle`، `Walking`، `Running`، `Rifle Aiming Idle`، `Falling Back Death`، `Talking` و `Pointing`.

تنظیمات: FBX Binary، 30 FPS، Without Skin برای حرکت‌ها؛ In Place فقط برای Walking و Running. T-pose پایه With Skin. نام‌ها و مسیرهای دقیق در `tools/characters/recipes/commander-medium.json` ثبت شده‌اند.

## ترتیب اجرا

### 1. قرارداد roster و presetها

- [ ] مانیفست ۲۲ نقش را نگه دار اما `tier` اضافه کن و دقیقاً ۶ `main` و ۱۶ `secondary` را اعتبارسنجی کن.
- [ ] برای هر نقش `appearance` شامل bodyScale، skinTone، faceMorph، outfit، accentColor و faceMode تعریف کن.
- [ ] تست‌های contract باید شمار، نقش‌های اصلی، منع شخصیت زن و داده‌های variation را بررسی کنند.

### 2. CharacterGenerator

- [ ] `src/entities/character-generator.js` را با TDD بساز.
- [ ] فقط template GLB اسکلت‌دار را clone کند؛ بافت/لباس مشترک را reuse کند، morph targetهای مجاز را clamp کند و variation را روی clone اعمال کند.
- [ ] خروجی: `{root, face, outfitParts, dispose()}`؛ بدون model واقعی تست با fake SkinnedMesh انجام می‌شود.

### 3. AnimationManager

- [ ] `src/entities/animation-manager.js` را با TDD و بدون وابستگی تازه بساز.
- [ ] stateهای عمومی: `idle`، `walk`، `run`، `aim`، `fall`، `talk`، `point`.
- [ ] transition قابل تنظیم، cross-fade، guard برای state نامعتبر و pause/dispose داشته باشد.

### 4. DialogueManager

- [ ] `assets/data/dialogues.json`، `src/entities/dialogue-manager.js` و UI زیرنویس را با TDD اضافه کن.
- [ ] هر node: `id`، `speaker`، `text`، `next`، `animation`، `durationMs`.
- [ ] خروجی فقط زیرنویس فارسی و mouth-open morph/timer است؛ شاخهٔ دیالوگ یا صدا در این گام اضافه نمی‌شود.

### 5. CharacterManager

- [ ] `src/entities/character-manager.js` مالک هر ۲۲ actor باشد.
- [ ] API: `preload(ids)`، `spawnCharacter(id, position, options)`، `get(id)`، `update(dt, cameraPosition)`، `remove(id)` و `dispose()`.
- [ ] کاراکترهای اصلی variation اختصاصی و LOD نزدیک می‌گیرند؛ فرعی‌ها template/texture/mixer مشترک می‌گیرند.

### 6. اتصال بازی و اعتبار نهایی

- [ ] scripts را به ترتیب roster → loader → generator → animation → dialogue → manager در boot اضافه کن.
- [ ] یک trigger دیالوگ غیرمخرب در عملیات اول و یک shortcut debug برای ۲۰ actor اضافه کن.
- [ ] تست‌های lifecycle، رگرسیون موجود و آزمون دستی روی سیستم Intel HD 5500 اجرا شوند.

## معیار پایان

کدهای پنج‌گانه مستقل تست شوند؛ با ورود GLB و هفت FBX کاربر، builder آن‌ها را به GLBهای production تبدیل کند و هر ۲۲ نقش بدون primitive fallback در صحنه ظاهر شوند.
