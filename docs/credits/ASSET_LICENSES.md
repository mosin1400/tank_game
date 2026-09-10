# دارایی‌ها و مجوزهای پروژهٔ T-34/85

این فایل مرجع واحدِ منشأ، وضعیت مجوز و نحوهٔ استفاده از دارایی‌های غیرکدنویسی‌شدهٔ پروژه است. «تأییدنشده» به معنی ممنوع‌بودن نیست؛ یعنی سند اصلیِ خرید/دانلود یا نام سازنده هنوز در مخزن ثبت نشده و پیش از انتشار تجاری باید تکمیل شود.

| گروه / فایل‌های پروژه | منشأ | مجوز یا وضعیت | استفاده در پروژه |
| --- | --- | --- | --- |
| `assets/models/environment/m02/harbor-*.glb` و `assets/images/m02-harbor/*` | 3TD Studios Free Sample Pack #2؛ ZIP کاربر: `3td_Harbor Pack.zip` | اجازهٔ استفاده در بازی؛ بازبسته‌بندی یا فروش خودِ پک به نام اثر خودمان ممنوع است. | کلبهٔ صنعتی، اسکله و برج دیده‌بانی عملیات ۰۲. |
| `assets/models/environment/m02/ruin-*.glb` | LowPoly Apocalyptic Buildings by Majadroid؛ ZIP کاربر: `LowPoly-Apocalyptic-Buildings-By-Majadroid.zip` | CC0؛ ذکر نام لازم نیست اما قدردانی شده است. | ساختمان مخروبه و آوار عملیات ۰۲. |
| `assets/models/vehicles/uaz-452.glb` و `uaz-452-destroyed.glb` | Mehozavr، [OpenGameArt: UAZ-452 Utility Van](https://opengameart.org/node/165264)؛ ZIP کاربر: `uaz-452.zip` | CC0. | ون پشتیبانی و نسخهٔ آسیب‌دیده برای صحنه‌ها. |
| `assets/models/vehicles/soviet-offroad.glb` | artie31، [OpenGameArt: Soviet military off-road vehicle](https://opengameart.org/content/soviet-military-off-road-vehicle)؛ ZIP کاربر: `soviet_military_off-road_vehicle.zip` | CC0؛ ذکر نام سازنده قدردانی می‌شود. | جیپ نظامی همراه ستون. |
| `assets/models/vehicles/truck-01.glb` تا `truck-05.glb` | mehrasaur، [3D Vehicles Pack](https://opengameart.org/content/3d-vehicles-pack)؛ ZIP کاربر: `vehicle_pack.zip` | CC0؛ مدل‌ها بدون بافت/UV هستند و رنگ در بازی اعمال می‌شود. | سه کامیون متحرک کاروان و دو کامیون صحنه‌ای. |
| `assets/models/characters/**/*` و `assets/models/characters/animation/*` | مدل و حرکت‌های کاربر-تهیه‌شده با مسیر MakeHuman/Mixamo و فایل‌های FBX دریافت‌شده در مراحل قبلی. | نیازمند ثبت نام دقیق فایل منبع و شرایط دانلود در زمان انتشار. مجوز MakeHuman و Mixamo در `docs/credits/assets.md` با وضعیت تاریخی ثبت شده‌اند، اما برای GLBهای فعلی نباید بدون سند اصلی ادعای CC0 شود. | همهٔ شخصیت‌های انسانی و انیمیشن‌ها. |
| `assets/audio/*.mp3` | فایل‌های قرارگرفته توسط کاربر. | منبع/مجوز در مخزن ثبت نشده؛ پیش از انتشار عمومی باید تکمیل شود. | موسیقی بازی. |
| `assets/video/loading-intro.mp4` | فایل قرارگرفته توسط کاربر. | منبع/مجوز در مخزن ثبت نشده. | ویدئوی صفحهٔ بارگذاری. |
| `assets/images/campaign-map-*.png`، `icon.png`، `m01-*.png`، `m02-marsh-mud.png`، `tank-worn-olive-steel.png` | تصاویر تولیدشده یا قرارگرفته در جریان ساخت پروژه. | منشأ بیرونیِ جداگانه ثبت نشده؛ پیش از انتشار تجاری، پرامپت/فایل منشأ یا مجوز نهایی باید بایگانی شود. | نقشه، UI و تکسچرهای صحنه/تانک. |
| مدل‌های تانک، کامیون موقت، سلاح، گلوله، افکت و اجزای صحنهٔ ساخته‌شده با Three.js | کدنویسی و مدل‌سازی رویه‌ای خود پروژه. | دارایی داخلی پروژه؛ مجوز شخص ثالث جداگانه ندارد. | گیم‌پلی و صحنه‌ها. |

## قواعد انتشار

1. دارایی‌های CC0 را می‌توان همراه بازی منتشر کرد، اما نام سازنده و URL بالا برای اعتبار و نگه‌داری بهتر حفظ می‌شود.
2. دارایی‌های 3TD باید همراه این یادداشت بمانند و هرگز به‌تنهایی به‌عنوان یک «پک مدل» بازفروشی نشوند.
3. پیش از انتشار عمومی یا تجاری، ردیف‌های «منبع/مجوز ثبت نشده» باید با رسید خرید، URL اصلی یا مجوز کتبی تکمیل شوند.
4. هر دارایی خارجی جدید باید پیش از ورود به `assets/` به این فایل افزوده شود؛ فایل خام دانلودی تا هنگام استفاده در `Downloads` می‌ماند.
