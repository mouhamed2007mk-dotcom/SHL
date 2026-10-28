import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpLeft,
  CarFront,
  Check,
  CircleHelp,
  Fuel,
  Gauge,
  Heart,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { fetchCars } from './data/cars'
import type { Car } from './types'
import { hasSupabaseConfig, supabase } from './lib/supabase'

type Theme = 'light' | 'dark'
type AuthMode = 'login' | 'signup' | 'forgot' | 'update-password'

const money = (amount: number) =>
  new Intl.NumberFormat('ar-MR', {
    maximumFractionDigits: 0,
  }).format(amount) + ' MRU'

function useCars() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadCars() {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchCars()
        if (active) setCars(result)
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'حدث خطأ أثناء تحميل السيارات.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadCars()
    return () => {
      active = false
    }
  }, [])

  return { cars, loading, error }
}

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="SHL سهل - الرئيسية">
      <span className="brand-mark">SH<span>↗</span></span>
      <span className="brand-name">
        سهل <small>SHL RENTALS</small>
      </span>
    </Link>
  )
}

function Header({
  theme,
  onToggleTheme,
}: {
  theme: Theme
  onToggleTheme: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="header">
      <div className="container nav">
        <Brand />

        <button
          type="button"
          className="mobile-menu icon-button"
          aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(value => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <Link to="/cars" onClick={() => setMenuOpen(false)}>
            استكشف السيارات
          </Link>
          <a href="/#how" onClick={() => setMenuOpen(false)}>
            كيف تعمل سهل؟
          </a>
          <a href="/#support" onClick={() => setMenuOpen(false)}>
            المساعدة
          </a>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="icon-button theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <Link className="button button-dark button-small" to="/login">
            تسجيل الدخول <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </header>
  )
}

function LoadingState({
  message = 'جارٍ تحميل السيارات...',
}: {
  message?: string
}) {
  return (
    <div className="empty-state" role="status">
      <span className="loading-icon"><CarFront size={32} /></span>
      <p>{message}</p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty-state" role="alert">
      <CircleHelp size={32} />
      <h2>تعذّر تحميل البيانات</h2>
      <p>{message}</p>
      {!hasSupabaseConfig && (
        <p>تحقق من ملف .env.local ثم أعد تشغيل المشروع.</p>
      )}
      <button
        type="button"
        className="button button-dark"
        onClick={() => window.location.reload()}
      >
        إعادة المحاولة
      </button>
    </div>
  )
}

function CarCard({ car }: { car: Car }) {
  const [saved, setSaved] = useState(false)

  return (
    <motion.article
      className="car-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.4 }}
    >
      <div className="car-image-wrap">
        <img src={car.image} alt={car.name} loading="lazy" />
        <span className="car-category">{car.category}</span>

        <button
          type="button"
          className={'favorite icon-button ' + (saved ? 'saved' : '')}
          aria-label={saved ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          aria-pressed={saved}
          onClick={() => setSaved(value => !value)}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="car-content">
        <div className="car-title-row">
          <h3>{car.name}</h3>
          <span className="availability"><i /> متاحة للطلب</span>
        </div>

        <p className="car-city">{car.city} · السعر اليومي</p>

        <div className="car-specs">
          <span><Users size={15} /> {car.seats} مقاعد</span>
          <span><Gauge size={15} /> {car.transmission}</span>
          <span><Fuel size={15} /> بنزين</span>
        </div>

        <div className="car-bottom">
          <p className="price">
            {money(car.dailyRate)} <small>/ يوم</small>
          </p>
          <Link className="button button-outline" to={`/cars/${car.id}`}>
            التفاصيل <ArrowLeft size={15} />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

function SearchPanel() {
  const [city, setCity] = useState('الكل')
  const [category, setCategory] = useState('الكل')
  const navigate = useNavigate()

  return (
    <form
      className="search-panel"
      onSubmit={event => {
        event.preventDefault()
        const params = new URLSearchParams()
        if (city !== 'الكل') params.set('city', city)
        if (category !== 'الكل') params.set('category', category)
        navigate(`/cars?${params.toString()}`)
      }}
    >
      <label>
        <span>مدينة الاستلام</span>
        <select value={city} onChange={event => setCity(event.target.value)}>
          <option value="الكل">كل المدن</option>
          <option value="نواكشوط">نواكشوط</option>
          <option value="نواذيبو">نواذيبو</option>
        </select>
      </label>

      <label>
        <span>فئة السيارة</span>
        <select
          value={category}
          onChange={event => setCategory(event.target.value)}
        >
          <option value="الكل">كل الفئات</option>
          <option value="اقتصادية">اقتصادية</option>
          <option value="سيدان">سيدان</option>
          <option value="SUV">SUV</option>
          <option value="فاخرة">فاخرة</option>
          <option value="عائلية">عائلية</option>
        </select>
      </label>

      <label>
        <span>تاريخ الاستلام</span>
        <input type="date" aria-label="تاريخ الاستلام" />
      </label>

      <label>
        <span>تاريخ الإرجاع</span>
        <input type="date" aria-label="تاريخ الإرجاع" />
      </label>

      <button className="button button-accent search-submit" type="submit">
        <Search size={18} /> ابحث عن سيارة
      </button>
    </form>
  )
}

function Home() {
  const reduceMotion = useReducedMotion()
  const { cars, loading, error } = useCars()

  return (
    <>
      <section className="hero">
        <div className="hero-backdrop" />

        <div className="container hero-inner">
          <motion.div
            className="hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <span className="eyebrow">
              <Sparkles size={15} /> تجربة تأجير بمعايير جديدة
            </span>

            <h1>سيارتك القادمة،<br /><em>أصبحت أقرب.</em></h1>

            <p>
              اختَر سيارتك بثقة. أسعار واضحة، تفاصيل دقيقة،
              وحجز بسيط من البداية حتى استلام المفتاح.
            </p>

            <div className="hero-points">
              <span><Check size={16} /> أسعار واضحة</span>
              <span><Check size={16} /> خيارات متنوعة</span>
              <span><Check size={16} /> دعم محلي</span>
            </div>

            <Link className="button button-dark hero-cta" to="/cars">
              اكتشف السيارات <ArrowLeft size={17} />
            </Link>
          </motion.div>

          <motion.div
            className="hero-image"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.1 }}
          >
            <img
              src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=85"
              alt="سيارة رياضية على طريق مفتوح"
            />
            <div className="image-caption">
              <span className="caption-dot" />
              <span>
                رحلتك تبدأ هنا
                <small>SHL · DRIVE WITH CONFIDENCE</small>
              </span>
              <ArrowUpLeft size={21} />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container search-container">
        <SearchPanel />
      </div>

      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow muted">اختيارات سهل</span>
            <h2>سيارات تستحق الطريق.</h2>
            <p>مجموعة مختارة لرحلتك القادمة، داخل المدينة أو خارجها.</p>
          </div>
          <Link to="/cars" className="text-link">
            كل السيارات <ArrowLeft size={17} />
          </Link>
        </div>

        {loading ? <LoadingState /> : error ? (
          <ErrorState message={error} />
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <CarFront size={32} />
            <h2>لا توجد سيارات متاحة حاليًا</h2>
            <p>ستظهر السيارات هنا عند إضافتها إلى المنصة.</p>
          </div>
        ) : (
          <div className="cars-grid">
            {cars.slice(0, 3).map(car => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}

        <div className="demo-note">
          <span className="note-icon"><ShieldCheck size={19} /></span>
          <span>
            <strong>شفافية من أول خطوة</strong>
            <small>
              يتم عرض الأسعار المسجلة؛ ويجب التحقق من السعر والتوفر
              النهائيين قبل تأكيد أي حجز.
            </small>
          </span>
        </div>
      </section>

      <section className="steps-section" id="how">
        <div className="container section">
          <div className="section-heading centered">
            <div>
              <span className="eyebrow muted">ببساطة، كما يجب</span>
              <h2>ثلاث خطوات. وانطلق.</h2>
              <p>تجربة واضحة بدون تعقيد.</p>
            </div>
          </div>

          <div className="steps-grid">
            <div className="step">
              <span>01</span>
              <div className="step-icon"><Search /></div>
              <h3>اختر سيارتك</h3>
              <p>قارن الخيارات والمواصفات والأسعار بكل وضوح.</p>
            </div>
            <div className="step">
              <span>02</span>
              <div className="step-icon"><ShieldCheck /></div>
              <h3>أرسل طلب الحجز</h3>
              <p>حدّد موعدك ومكان الاستلام وأرسل بياناتك المطلوبة.</p>
            </div>
            <div className="step">
              <span>03</span>
              <div className="step-icon"><CarFront /></div>
              <h3>استلم وانطلق</h3>
              <p>تابع حالة الطلب وتعليمات الاستلام من حسابك.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container trust-strip">
        <div><ShieldCheck /><strong>وضوح في الشروط</strong><span>اعرف التفاصيل قبل تأكيد طلبك</span></div>
        <div><Gauge /><strong>خيارات تناسبك</strong><span>من الاقتصادية إلى الفاخرة</span></div>
        <div><CircleHelp /><strong>دعم عند الحاجة</strong><span>قنوات مساعدة واضحة</span></div>
      </section>
    </>
  )
}

function CarsPage() {
  const { cars, loading, error } = useCars()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || 'الكل')
  const [city, setCity] = useState(searchParams.get('city') || 'الكل')
  const [sort, setSort] = useState('recommended')

  const filteredCars = useMemo(() => {
    return cars
      .filter(car => {
        const text = `${car.name} ${car.city} ${car.category}`.toLowerCase()
        const matchesQuery = text.includes(query.toLowerCase())
        const matchesCategory = category === 'الكل' || car.category === category
        const matchesCity = city === 'الكل' || car.city === city
        return matchesQuery && matchesCategory && matchesCity
      })
      .sort((a, b) => {
        if (sort === 'low') return a.dailyRate - b.dailyRate
        if (sort === 'high') return b.dailyRate - a.dailyRate
        return 0
      })
  }, [cars, query, category, city, sort])

  return (
    <main className="container page-content">
      <div className="breadcrumbs">
        <Link to="/">الرئيسية</Link><span>/</span><span>السيارات</span>
      </div>

      <div className="page-title-row">
        <div>
          <span className="eyebrow muted">اكتشف مجموعتنا</span>
          <h1>اعثر على سيارتك.</h1>
          <p>ابحث وقارن واختر ما يناسب رحلتك.</p>
        </div>
        <span className="result-count">{filteredCars.length} سيارات</span>
      </div>

      <div className="filters">
        <label className="search-input">
          <Search size={18} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو المدينة..."
          />
        </label>

        <label className="filter-select">
          <SlidersHorizontal size={17} />
          <select value={category} onChange={event => setCategory(event.target.value)}>
            <option value="الكل">كل الفئات</option>
            <option value="اقتصادية">اقتصادية</option>
            <option value="سيدان">سيدان</option>
            <option value="SUV">SUV</option>
            <option value="فاخرة">فاخرة</option>
            <option value="عائلية">عائلية</option>
          </select>
        </label>

        <label>
          <span className="sr-only">المدينة</span>
          <select className="sort-select" value={city} onChange={event => setCity(event.target.value)}>
            <option value="الكل">كل المدن</option>
            <option value="نواكشوط">نواكشوط</option>
            <option value="نواذيبو">نواذيبو</option>
          </select>
        </label>

        <select
          className="sort-select"
          value={sort}
          onChange={event => setSort(event.target.value)}
          aria-label="ترتيب السيارات"
        >
          <option value="recommended">الترتيب المقترح</option>
          <option value="low">السعر: الأقل أولًا</option>
          <option value="high">السعر: الأعلى أولًا</option>
        </select>
      </div>

      {loading ? <LoadingState /> : error ? (
        <ErrorState message={error} />
      ) : filteredCars.length > 0 ? (
        <div className="cars-grid">
          {filteredCars.map(car => <CarCard key={car.id} car={car} />)}
        </div>
      ) : (
        <div className="empty-state">
          <CarFront size={34} />
          <h2>لم نعثر على سيارات</h2>
          <p>جرّب تغيير كلمات البحث أو الفلاتر.</p>
          <button
            type="button"
            className="button button-dark"
            onClick={() => {
              setQuery('')
              setCategory('الكل')
              setCity('الكل')
            }}
          >
            مسح الفلاتر
          </button>
        </div>
      )}
    </main>
  )
}

function CarDetails() {
  const { id } = useParams<{ id: string }>()
  const { cars, loading, error } = useCars()
  const car = cars.find(item => item.id === id)

  if (loading) {
    return <main className="container page-content"><LoadingState message="جارٍ تحميل تفاصيل السيارة..." /></main>
  }

  if (error) {
    return <main className="container page-content"><ErrorState message={error} /></main>
  }

  if (!car) {
    return (
      <main className="container page-content">
        <div className="empty-state">
          <CarFront />
          <h2>السيارة غير موجودة</h2>
          <Link to="/cars" className="button button-dark">العودة للسيارات</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container page-content">
      <div className="breadcrumbs">
        <Link to="/">الرئيسية</Link><span>/</span>
        <Link to="/cars">السيارات</Link><span>/</span><span>{car.name}</span>
      </div>

      <div className="detail-layout">
        <div>
          <img className="detail-image" src={car.image} alt={car.name} />
          <div className="detail-copy">
            <span className="eyebrow muted">{car.category} · {car.city}</span>
            <h1>{car.name}</h1>
            <p>
              راجع تفاصيل السيارة. يجب تأكيد التوفر والسعر النهائي
              من المنصة قبل إتمام الحجز.
            </p>
            <div className="car-specs detail-specs">
              <span><Users size={17} /> {car.seats} مقاعد</span>
              <span><Gauge size={17} /> {car.transmission}</span>
              <span><Fuel size={17} /> بنزين</span>
            </div>
          </div>
        </div>

        <aside className="booking-box">
          <span className="eyebrow muted">السعر اليومي</span>
          <p className="detail-price">{money(car.dailyRate)} <small>/ يوم</small></p>
          <div className="notice">
            <ShieldCheck size={18} />
            <span>الحجز والدفع غير مفعّلين في هذه الصفحة بعد.</span>
          </div>
          <Link className="button button-dark full-width" to="/login">
            سجّل الدخول لمتابعة الطلب <ArrowLeft size={17} />
          </Link>
          <p className="fine-print">عرض السيارة لا يعني تأكيد توفرها للحجز.</p>
        </aside>
      </div>
    </main>
  )
}

function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get('mode') === 'recovery' ? 'update-password' : 'login',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')

    if (nextMode === 'update-password') {
      setSearchParams({ mode: 'recovery' })
    } else {
      setSearchParams({})
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!supabase) {
      setError('إعدادات Supabase غير موجودة. تحقق من ملف .env.local ثم أعد تشغيل المشروع.')
      return
    }

    if (mode !== 'forgot' && password.length < 8) {
      setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    if (mode === 'update-password' && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (authError) throw authError
        navigate('/cars', { replace: true })
        return
      }

      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/cars`,
          },
        })
        if (authError) throw authError

        if (data.session) {
          navigate('/cars', { replace: true })
          return
        }

        setMessage('تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. افتح الرسالة لتفعيل الحساب.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        return
      }

      if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/login?mode=recovery` },
        )
        if (authError) throw authError
        setMessage('إذا كان البريد مسجلًا، فستصلك رسالة لاستعادة كلمة المرور. تحقق من صندوق الوارد والبريد غير المرغوب فيه.')
        return
      }

      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError

      await supabase.auth.signOut()
      setMessage('تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.')
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setSearchParams({})
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : ''
      const translated: Record<string, string> = {
        'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولًا.',
        'User already registered': 'هذا البريد مسجل مسبقًا. جرّب تسجيل الدخول.',
        'Auth session missing!': 'انتهت جلسة الاستعادة. اطلب رابط استعادة جديدًا.',
      }

      setError(
        translated[rawMessage] ||
        rawMessage ||
        'تعذّرت العملية. تحقق من اتصال الإنترنت وإعدادات Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<AuthMode, string> = {
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب جديد',
    forgot: 'استعادة كلمة المرور',
    'update-password': 'تعيين كلمة مرور جديدة',
  }

  const descriptions: Record<AuthMode, string> = {
    login: 'ادخل إلى حسابك لمتابعة طلبات الحجز.',
    signup: 'أنشئ حسابك لتتمكن من متابعة طلباتك.',
    forgot: 'أدخل بريدك الإلكتروني لنرسل لك رابط الاستعادة.',
    'update-password': 'اختر كلمة مرور جديدة لحسابك.',
  }

  return (
    <main className="container auth-wrap">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Brand />
        <span className="eyebrow muted">مرحبًا بك في سهل</span>
        <h1>{titles[mode]}</h1>
        <p>{descriptions[mode]}</p>

        {error && <div className="notice" role="alert">{error}</div>}
        {message && <div className="notice success-notice" role="status">{message}</div>}

        <form onSubmit={handleSubmit}>
          {mode !== 'update-password' && (
            <label className="form-field">
              البريد الإلكتروني
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </label>
          )}

          {mode !== 'forgot' && (
            <label className="form-field">
              {mode === 'update-password' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
              <input
                required
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="8 أحرف على الأقل"
              />
            </label>
          )}

          {(mode === 'signup' || mode === 'update-password') && (
            <label className="form-field">
              تأكيد كلمة المرور
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                placeholder="أعد كتابة كلمة المرور"
              />
            </label>
          )}

          <button className="button button-dark full-width" type="submit" disabled={loading}>
            {loading
              ? 'يرجى الانتظار...'
              : mode === 'login'
                ? 'تسجيل الدخول'
                : mode === 'signup'
                  ? 'إنشاء الحساب'
                  : mode === 'forgot'
                    ? 'إرسال رابط الاستعادة'
                    : 'حفظ كلمة المرور'}
            {!loading && <ArrowLeft size={17} />}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button type="button" className="text-link" onClick={() => changeMode('forgot')}>
                نسيت كلمة المرور؟
              </button>
              <p>
                ليس لديك حساب؟{' '}
                <button type="button" className="text-link" onClick={() => changeMode('signup')}>
                  أنشئ حسابًا
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <p>
              لديك حساب بالفعل؟{' '}
              <button type="button" className="text-link" onClick={() => changeMode('login')}>
                تسجيل الدخول
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button type="button" className="text-link" onClick={() => changeMode('login')}>
              العودة إلى تسجيل الدخول
            </button>
          )}

          {mode === 'update-password' && (
            <p>افتح رابط الاستعادة الذي وصلك عبر البريد الإلكتروني للوصول إلى هذه الصفحة.</p>
          )}
        </div>

        <Link to="/cars" className="text-link auth-browse">
          تصفح السيارات دون تسجيل
        </Link>

        <p className="fine-print">
          {hasSupabaseConfig
            ? 'اتصال قاعدة البيانات مُهيأ. لا تشارك كلمة مرورك مع أي شخص.'
            : 'للتفعيل، أضف إعدادات Supabase إلى ملف .env.local.'}
        </p>
      </motion.div>
    </main>
  )
}

function Footer() {
  return (
    <footer className="footer" id="support">
      <div className="container footer-main">
        <div>
          <Brand />
          <p>تأجير سيارات بتجربة أوضح، وخطوات أسهل.</p>
        </div>

        <div>
          <strong>استكشف</strong>
          <Link to="/cars">السيارات</Link>
          <a href="/#how">كيف تعمل سهل؟</a>
        </div>

        <div>
          <strong>المساعدة</strong>
          <a href="mailto:support@shl.example">تواصل مع الدعم</a>
          <span>الشروط وسياسة الخصوصية</span>
        </div>

        <div className="footer-status">
          <span className="status-dot" />
          {hasSupabaseConfig ? 'إعداد الاتصال موجود' : 'قاعدة البيانات غير مهيأة'}
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} SHL سهل. جميع الحقوق محفوظة.</span>
        <span>صُممت لتسهيل رحلتك.</span>
      </div>
    </footer>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('shl-theme')
      if (saved === 'dark' || saved === 'light') return saved
    } catch {
      // استخدم الوضع الفاتح إذا لم يتوفر التخزين.
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('shl-theme', theme)
    } catch {
      // يظل تغيير المظهر فعالًا خلال الجلسة.
    }
  }, [theme])

  return (
    <>
      <Header
        theme={theme}
        onToggleTheme={() =>
          setTheme(current => current === 'dark' ? 'light' : 'dark')
        }
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cars" element={<CarsPage />} />
        <Route path="/cars/:id" element={<CarDetails />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <main className="container page-content empty-state">
              <h1>الصفحة غير موجودة</h1>
              <Link className="button button-dark" to="/">
                العودة للرئيسية
              </Link>
            </main>
          }
        />
      </Routes>

      <Footer />
    </>
  )
}