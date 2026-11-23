
import React, { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import {
  Heart, Users, Stethoscope, ArrowRight, ShieldCheck,
  Activity, ClipboardList, LogOut, Menu, X, Sparkles,
  CalendarDays, HandHeart, Copy, Link2, Search,
  Eye, Check, ArrowLeft, RefreshCw, UserRound,
  LockKeyhole, BookOpen, TrendingUp, AlertCircle,
  FileText, ExternalLink, Clock, PlusCircle
} from 'lucide-react';

const roles = {
  patient: {
    label: 'Doente',
    icon: Heart,
    intro: 'O seu espaço de acompanhamento e bem-estar.'
  },
  caregiver: {
    label: 'Cuidador',
    icon: HandHeart,
    intro: 'O seu bem-estar também merece cuidado.'
  },
  professional: {
    label: 'Profissional de saúde',
    icon: Stethoscope,
    intro: 'Acompanhe necessidades e coordene cuidados.'
  }
};

const specialties = [
  'Medicina Geral e Familiar',
  'Oncologia',
  'Enfermagem',
  'Psicologia',
  'Medicina Interna',
  'Cuidados Paliativos',
  'Serviço Social',
  'Outra'
];

const resources = [
  {
    title: 'SNS 24',
    description: 'Informação e orientação sobre saúde e serviços de saúde.',
    url: 'https://www.sns24.gov.pt/'
  },
  {
    title: 'Serviço Nacional de Saúde',
    description: 'Portal oficial com informação sobre cuidados e serviços.',
    url: 'https://www.sns.gov.pt/'
  },
  {
    title: 'Cuidadores Portugal',
    description: 'Informação e apoio dirigido a cuidadores informais.',
    url: 'https://www.cuidadoresportugal.pt/'
  },
  {
    title: 'Direitos e apoio ao cuidador informal',
    description: 'Informação sobre medidas de apoio aos cuidadores.',
    url: 'https://www.seg-social.pt/'
  }
];

function formatDate(value) {
  if (!value) return 'Data não disponível';

  return new Date(value).toLocaleString('pt-PT', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function formatAnswer(value) {
  if (value === null || value === undefined || value === '') {
    return 'Não preenchido';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Nenhuma opção selecionada';
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${formatAnswer(item)}`)
      .join('\n');
  }

  return String(value);
}

function getConcernScore(records) {
  if (!records?.length) return 0;

  const latest = records[0];
  const answers = latest.answers || {};

  const numericKeys = [
    'pain',
    'fatigue',
    'breathlessness',
    'nausea',
    'sleep',
    'appetite'
  ];

  let total = 0;
  let count = 0;

  numericKeys.forEach(key => {
    const value = Number(answers[key]);

    if (answers[key] !== undefined && !Number.isNaN(value)) {
      total += value;
      count++;
    }
  });

  let score = count ? (total / count) * 10 : 0;

  const mood = String(answers.mood || '').toLowerCase();

  if (
    mood.includes('muito triste') ||
    mood.includes('desesper') ||
    mood.includes('medo intenso')
  ) {
    score += 20;
  } else if (
    mood.includes('triste') ||
    mood.includes('ansioso') ||
    mood.includes('medo') ||
    mood.includes('preocupado')
  ) {
    score += 10;
  }

  return Math.min(100, Math.round(score));
}

function EvolutionChart({ records }) {
  const points = useMemo(() => {
    return [...records]
      .filter(item => item.kind === 'patient')
      .reverse()
      .slice(-10)
      .map((item, index) => {
        const a = item.answers || {};
        const values = [
          Number(a.pain || 0),
          Number(a.fatigue || 0),
          Number(a.breathlessness || 0),
          Number(a.nausea || 0)
        ];

        const average = values.reduce((sum, value) => sum + value, 0) / 4;

        return {
          x: 35 + index * (330 / Math.max(1, Math.min(9, records.length - 1))),
          y: 175 - average * 14,
          value: Math.round(average * 10),
          date: new Date(item.created_at).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit'
          })
        };
      });
  }, [records]);

  if (!points.length) {
    return <p className="muted">Ainda não existem avaliações suficientes para apresentar a evolução.</p>;
  }

  const path = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div>
      <p className="muted">
        Índice ilustrativo de sintomas físicos, calculado a partir das avaliações registadas.
        Não corresponde a uma escala clínica validada.
      </p>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox="0 0 390 220" style={{ width: '100%', minWidth: '280px' }}>
          {[35, 70, 105, 140, 175].map(y => (
            <line
              key={y}
              x1="25"
              y1={y}
              x2="370"
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="4 4"
            />
          ))}

          <text x="4" y="39" fontSize="10" fill="#6b7280">10</text>
          <text x="10" y="109" fontSize="10" fill="#6b7280">5</text>
          <text x="10" y="178" fontSize="10" fill="#6b7280">0</text>

          <path
            d={path}
            fill="none"
            stroke="#9b5878"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#9b5878" />
              <text
                x={p.x}
                y="198"
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <small className="muted">0 = menor intensidade</small>
        <small className="muted">10 = maior intensidade</small>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState('home');
  const [role, setRole] = useState('patient');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [entries, setEntries] = useState([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    specialty: ''
  });

  const [assessment, setAssessment] = useState({
    pain: 0,
    fatigue: 0,
    breathlessness: 0,
    nausea: 0,
    sleep: 0,
    appetite: 0,
    mood: 'Tranquilo/a',
    emotionalSupport: 'Sim',
    socialSupport: 'Adequado',
    notes: ''
  });

  const [care, setCare] = useState({
    wellbeing: 'Razoável',
    difficulties: [],
    needs: [],
    notes: ''
  });

  const [note, setNote] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [associationBusy, setAssociationBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMode, setResetMode] = useState(false);

  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientEntries, setPatientEntries] = useState([]);
  const [viewedEntries, setViewedEntries] = useState({});
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [viewingBusy, setViewingBusy] = useState(null);

  const [caregiverPatient, setCaregiverPatient] = useState(null);
  const [loadingCaregiverPatient, setLoadingCaregiverPatient] = useState(false);

  const [professionalNotes, setProfessionalNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [dashboardTab, setDashboardTab] = useState('overview');

  const configured = Boolean(supabaseConfigured && supabase);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session) setPage('dashboard');
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (event === 'SIGNED_IN' && currentSession) {
          setPage('dashboard');
        }

        if (event === 'SIGNED_OUT') {
          clearUserData();
        }

        if (event === 'PASSWORD_RECOVERY') {
          setPage('reset-password');
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      setProfile(null);
      return;
    }

    loadProfile();
  }, [session]);

  function clearUserData() {
    setProfile(null);
    setEntries([]);
    setPatients([]);
    setCaregiverPatient(null);
    setSelectedPatient(null);
    setPatientEntries([]);
    setViewedEntries({});
    setProfessionalNotes([]);
    setPage('home');
  }

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, association_code, professional_specialty')
      .eq('id', session.user.id)
      .single();

    if (error) {
      setMessage('Não foi possível carregar o perfil: ' + error.message);
      return;
    }

    setProfile(data);

    if (data.role === 'professional') {
      await loadPatients();
      await loadProfessionalNotes();
    } else if (data.role === 'caregiver') {
      await loadEntries();
      await loadCaregiverPatient();
    } else if (data.role === 'patient') {
      await loadEntries();
    }
  }

  async function loadEntries() {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error) setEntries(data || []);
    else setMessage('Não foi possível carregar os registos: ' + error.message);
  }

  async function loadCaregiverPatient() {
    if (!session) return;

    setLoadingCaregiverPatient(true);

    const { data: link, error } = await supabase
      .from('patient_team_members')
      .select('patient_id')
      .eq('member_id', session.user.id)
      .eq('member_role', 'caregiver')
      .maybeSingle();

    if (error) {
      setMessage('Não foi possível carregar a associação: ' + error.message);
      setCaregiverPatient(null);
      setLoadingCaregiverPatient(false);
      return;
    }

    if (!link) {
      setCaregiverPatient(null);
      setLoadingCaregiverPatient(false);
      return;
    }

    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('id, full_name, association_code')
      .eq('id', link.patient_id)
      .single();

    if (patientError) {
      setMessage('Não foi possível carregar o doente associado: ' + patientError.message);
      setCaregiverPatient(null);
    } else {
      setCaregiverPatient(patient);
    }

    setLoadingCaregiverPatient(false);
  }

  async function loadPatients() {
    if (!session) return;

    setLoadingPatients(true);

    const { data: links, error } = await supabase
      .from('patient_team_members')
      .select('patient_id')
      .eq('member_id', session.user.id)
      .eq('member_role', 'professional');

    if (error) {
      setMessage('Não foi possível carregar os doentes: ' + error.message);
      setLoadingPatients(false);
      return;
    }

    const ids = [...new Set((links || []).map(item => item.patient_id))];

    if (!ids.length) {
      setPatients([]);
      setLoadingPatients(false);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, association_code')
      .in('id', ids);

    if (profileError) {
      setMessage('Não foi possível carregar os perfis: ' + profileError.message);
      setLoadingPatients(false);
      return;
    }

    const enriched = await Promise.all((profiles || []).map(async patient => {
      const { data: team } = await supabase
        .from('patient_team_members')
        .select('member_id')
        .eq('patient_id', patient.id)
        .eq('member_role', 'caregiver');

      const userIds = [
        patient.id,
        ...(team || []).map(item => item.member_id)
      ];

      const { data: records } = await supabase
        .from('check_ins')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(20);

      const patientRecords = (records || []).filter(r => r.user_id === patient.id);

      return {
        ...patient,
        concernScore: getConcernScore(patientRecords),
        lastRecord: records?.[0]?.created_at || null,
        recordCount: records?.length || 0
      };
    }));

    enriched.sort((a, b) => {
      if (b.concernScore !== a.concernScore) {
        return b.concernScore - a.concernScore;
      }

      if (!a.lastRecord) return 1;
      if (!b.lastRecord) return -1;

      return new Date(b.lastRecord) - new Date(a.lastRecord);
    });

    setPatients(enriched);
    setLoadingPatients(false);
  }

  async function openPatient(patient) {
    setSelectedPatient(patient);
    setPatientEntries([]);
    setViewedEntries({});
    setLoadingRecords(true);
    setMessage('');

    const { data: team, error: teamError } = await supabase
      .from('patient_team_members')
      .select('member_id')
      .eq('patient_id', patient.id)
      .eq('member_role', 'caregiver');

    if (teamError) {
      setMessage('Não foi possível carregar os cuidadores: ' + teamError.message);
      setLoadingRecords(false);
      return;
    }

    const userIds = [
      patient.id,
      ...(team || []).map(item => item.member_id)
    ];

    const { data: records, error } = await supabase
      .from('check_ins')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('Não foi possível carregar os registos: ' + error.message);
      setLoadingRecords(false);
      return;
    }

    setPatientEntries(records || []);

    if (records?.length) {
      const { data: views, error: viewsError } = await supabase
        .from('check_in_views')
        .select('check_in_id, viewed_at, professional_id')
        .in('check_in_id', records.map(item => item.id))
        .eq('professional_id', session.user.id);

      if (viewsError) {
        setMessage('Não foi possível consultar as visualizações: ' + viewsError.message);
      } else {
        const map = {};

        (views || []).forEach(item => {
          map[item.check_in_id] = item.viewed_at;
        });

        setViewedEntries(map);
      }
    }

    setLoadingRecords(false);
  }

  async function markAsViewed(recordId) {
    setViewingBusy(recordId);
    setMessage('');

    const { error } = await supabase
      .from('check_in_views')
      .insert({
        check_in_id: recordId,
        professional_id: session.user.id
      });

    setViewingBusy(null);

    if (error) {
      if (error.code === '23505') {
        setMessage('Este registo já foi marcado como visualizado.');
        await openPatient(selectedPatient);
      } else {
        setMessage('Não foi possível guardar a visualização: ' + error.message);
      }

      return;
    }

    setViewedEntries(previous => ({
      ...previous,
      [recordId]: new Date().toISOString()
    }));

    setMessage('Registo marcado como visualizado.');
  }

  async function signUp(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const metadata = {
      full_name: form.name,
      requested_role: form.role,
      professional_specialty: form.role === 'professional' ? form.specialty : ''
    };

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: metadata }
    });

    if (!error && data.session && form.role === 'professional') {
      await supabase
        .from('profiles')
        .update({ professional_specialty: form.specialty })
        .eq('id', data.user.id);
    }

    setBusy(false);

    setMessage(
      error
        ? error.message
        : 'Conta criada. Verifique o seu email para confirmar o registo.'
    );
  }

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSession(data.session);
    setPage('dashboard');
    setMessage('');
  }

  async function sendPasswordReset(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin
    });

    setBusy(false);

    setMessage(
      error
        ? error.message
        : 'Enviámos um email com as instruções para recuperar a palavra-passe.'
    );
  }

  async function updatePassword(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const password = form.password;

    if (password.length < 8) {
      setBusy(false);
      setMessage('A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Palavra-passe atualizada com sucesso.');
    setPage('dashboard');
    setForm(previous => ({ ...previous, password: '' }));
  }

  async function joinPatient(e) {
    e.preventDefault();

    if (!joinCode.trim()) {
      setMessage('Introduza o código de associação do doente.');
      return;
    }

    setAssociationBusy(true);
    setMessage('');

    const { error } = await supabase.rpc('join_patient_by_code', {
      p_code: joinCode.trim().toUpperCase()
    });

    setAssociationBusy(false);

    if (error) {
      setMessage('Não foi possível fazer a associação: ' + error.message);
      return;
    }

    setJoinCode('');
    setMessage('Associação realizada com sucesso!');

    if (profile.role === 'professional') {
      await loadPatients();
    } else if (profile.role === 'caregiver') {
      await loadCaregiverPatient();
    }
  }

  async function saveCheckIn(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const payload = profile.role === 'patient'
      ? { kind: 'patient', answers: assessment }
      : { kind: 'caregiver', answers: care };

    const { error } = await supabase
      .from('check_ins')
      .insert({
        user_id: session.user.id,
        ...payload
      });

    setBusy(false);

    if (error) {
      setMessage('Não foi possível guardar o registo: ' + error.message);
      return;
    }

    setMessage('Registo guardado com sucesso.');

    setAssessment({
      pain: 0,
      fatigue: 0,
      breathlessness: 0,
      nausea: 0,
      sleep: 0,
      appetite: 0,
      mood: 'Tranquilo/a',
      emotionalSupport: 'Sim',
      socialSupport: 'Adequado',
      notes: ''
    });

    setCare({
      wellbeing: 'Razoável',
      difficulties: [],
      needs: [],
      notes: ''
    });

    await loadEntries();
  }

  async function loadProfessionalNotes() {
    if (!session) return;

    setLoadingNotes(true);

    const { data, error } = await supabase
      .from('professional_notes')
      .select('*')
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error) setProfessionalNotes(data || []);
    else setMessage('Não foi possível carregar as notas: ' + error.message);

    setLoadingNotes(false);
  }

  async function saveProfessionalNote(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { error } = await supabase
      .from('professional_notes')
      .insert({
        author_id: session.user.id,
        note
      });

    setBusy(false);

    if (error) {
      setMessage('Não foi possível guardar a nota: ' + error.message);
      return;
    }

    setNote('');
    setMessage('Nota guardada com sucesso.');
    await loadProfessionalNotes();
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearUserData();
    setSession(null);
  }

  function go(nextPage) {
    setPage(nextPage);
    setMessage('');
    setMobileMenu(false);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function copyCode(code) {
    if (!code) return;

    navigator.clipboard?.writeText(code)
      .then(() => setMessage('Código copiado.'))
      .catch(() => setMessage('Não foi possível copiar automaticamente. Selecione o código para o copiar.'));
  }

  const filteredPatients = patients.filter(patient =>
    (patient.full_name || '')
      .toLowerCase()
      .includes(patientSearch.toLowerCase())
  );

  const latestScore = selectedPatient?.concernScore ?? 0;

  return (
    <div className="app">
      <header className="header">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            go(session ? 'dashboard' : 'home');
          }}
        >
          <span className="brand-mark"><Heart size={21}/></span>
          <span>PallBridge <b>360</b></span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMobileMenu(!mobileMenu)}
          aria-label="Abrir menu"
        >
          {mobileMenu ? <X/> : <Menu/>}
        </button>

        <nav className={mobileMenu ? 'nav open' : 'nav'}>
          <a href="#how" onClick={e => {
            e.preventDefault();
            go('home');
            setTimeout(() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }), 50);
          }}>
            Como funciona
          </a>

          <a href="#about" onClick={e => {
            e.preventDefault();
            go('home');
            setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 50);
          }}>
            Sobre
          </a>

          {session ? (
            <button className="button small" onClick={() => go('dashboard')}>
              A minha área
            </button>
          ) : (
            <button className="button small" onClick={() => go('login')}>
              Entrar
            </button>
          )}
        </nav>
      </header>

      {!configured && (
        <div className="setup-banner">
          <ShieldCheck size={17}/>
          Para ativar contas e guardar dados, liga o projeto a uma base de dados Supabase.
        </div>
      )}

      {page === 'home' && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={14}/> Cuidado contínuo e integrado</span>

              <h1>
                Cuidar é estar presente. <em>Em todas as dimensões.</em>
              </h1>

              <p>
                Uma plataforma que aproxima pessoas, cuidadores e profissionais de saúde,
                promovendo um acompanhamento mais próximo, contínuo e centrado nas necessidades de cada pessoa.
              </p>

              <button className="button" onClick={() => go('register')}>
                Começar agora <ArrowRight size={17}/>
              </button>

              <div className="hero-proof">
                <span><ShieldCheck size={16}/> Cuidado centrado na pessoa</span>
                <span><Users size={16}/> Trabalho em equipa</span>
              </div>
            </div>

            <div className="hero-art">
              <div className="art-orb orb-one"></div>
              <div className="art-orb orb-two"></div>

              <div className="art-card">
                <div className="art-people">
                  <span>👵🏻</span><span>👩🏻</span><span>🧑🏻‍⚕️</span>
                </div>
                <div className="art-labels">
                  <b>Doente</b><b>Cuidador</b><b>Profissional de saúde</b>
                </div>
                <div className="art-message">
                  <Heart size={17} fill="currentColor"/>
                  Cuidar em conjunto faz a diferença
                </div>
              </div>

              <div className="float-pill pill-a">♡ Bem-estar</div>
              <div className="float-pill pill-b">✧ Acompanhamento</div>
            </div>
          </section>

          <section className="section" id="access">
            <div className="section-heading">
              <span className="eyebrow">A sua área</span>
              <h2>Uma plataforma, três perspetivas.</h2>
              <p>Escolha o seu perfil para conhecer as funcionalidades.</p>
            </div>

            <div className="role-grid">
              {Object.entries(roles).map(([key, item]) => {
                const Icon = item.icon;

                return (
                  <article className="role-card" key={key}>
                    <div className="role-icon"><Icon size={25}/></div>
                    <h3>Sou {item.label.toLowerCase()}</h3>
                    <p>{item.intro}</p>

                    <button className="text-button" onClick={() => {
                      setRole(key);
                      setForm(previous => ({ ...previous, role: key }));
                      go('login');
                    }}>
                      Entrar nesta área <ArrowRight size={16}/>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="section how-section" id="how">
            <div className="section-heading">
              <span className="eyebrow">Como funciona</span>
              <h2>Da partilha à ação.</h2>
              <p>Uma ligação entre quem recebe, quem cuida e quem acompanha.</p>
            </div>

            <div className="steps">
              <div><span>01</span><h3>Partilhar</h3><p>Doentes e cuidadores registam o seu estado, preocupações e necessidades.</p></div>
              <div><span>02</span><h3>Acompanhar</h3><p>A informação permite acompanhar a evolução ao longo do tempo.</p></div>
              <div><span>03</span><h3>Agir em conjunto</h3><p>A equipa pode identificar prioridades e coordenar respostas de apoio.</p></div>
            </div>
          </section>

          <section className="about" id="about">
            <div>
              <span className="eyebrow">PallBridge 360</span>
              <h2>O cuidado vê a pessoa por inteiro.</h2>
              <p>
                Valorizamos as dimensões física, psicológica, social e espiritual,
                promovendo comunicação e continuidade dos cuidados.
              </p>
            </div>
            <div className="about-symbol"><Heart size={50}/><span>360°</span></div>
          </section>
        </main>
      )}

      {(page === 'login' || page === 'register' || page === 'reset-password' || page === 'forgot-password') && (
        <main className="auth-wrap">
          <div className="auth-card">
            <button className="back" onClick={() => go('home')}>
              <ArrowLeft size={15}/> Voltar à página inicial
            </button>

            <span className="eyebrow">
              Área pessoal · {roles[role]?.label || 'Utilizador'}
            </span>

            <h2>
              {page === 'login' && 'Bem-vindo/a de volta.'}
              {page === 'register' && 'Criar conta PallBridge 360'}
              {page === 'forgot-password' && 'Recuperar palavra-passe'}
              {page === 'reset-password' && 'Escolher nova palavra-passe'}
            </h2>

            <p className="muted">
              {page === 'login' && 'Entre para aceder ao seu espaço de acompanhamento.'}
              {page === 'register' && 'Preencha os seus dados para criar a sua conta.'}
              {page === 'forgot-password' && 'Indique o email associado à sua conta.'}
              {page === 'reset-password' && 'Introduza a nova palavra-passe que pretende utilizar.'}
            </p>

            {page === 'login' && (
              <form onSubmit={signIn}>
                <label>Email
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="nome@email.com"
                  />
                </label>

                <label>Palavra-passe
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="A sua palavra-passe"
                  />
                </label>

                <button className="button full" disabled={busy || !configured}>
                  {busy ? 'A entrar…' : 'Iniciar sessão'} <ArrowRight size={17}/>
                </button>

                <button type="button" className="text-button" onClick={() => go('forgot-password')}>
                  Esqueci-me da palavra-passe
                </button>
              </form>
            )}

            {page === 'register' && (
              <form onSubmit={signUp}>
                <label>Nome completo
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="O seu nome"
                  />
                </label>

                <label>Email
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="nome@email.com"
                  />
                </label>

                <label>Palavra-passe
                  <input
                    type="password"
                    minLength="8"
                    required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo de 8 caracteres"
                  />
                </label>

                <label>Perfil
                  <select
                    value={form.role}
                    onChange={e => {
                      setForm({ ...form, role: e.target.value });
                      setRole(e.target.value);
                    }}
                  >
                    <option value="patient">Doente</option>
                    <option value="caregiver">Cuidador</option>
                    <option value="professional">Profissional de saúde</option>
                  </select>
                </label>

                {form.role === 'professional' && (
                  <label>Área profissional / especialidade
                    <select
                      required
                      value={form.specialty}
                      onChange={e => setForm({ ...form, specialty: e.target.value })}
                    >
                      <option value="">Selecione a sua área</option>
                      {specialties.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                )}

                <button className="button full" disabled={busy || !configured}>
                  {busy ? 'A criar conta…' : 'Criar conta'} <ArrowRight size={17}/>
                </button>
              </form>
            )}

            {page === 'forgot-password' && (
              <form onSubmit={sendPasswordReset}>
                <label>Email associado à conta
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="nome@email.com"
                  />
                </label>

                <button className="button full" disabled={busy || !configured}>
                  {busy ? 'A enviar…' : 'Enviar instruções'} <ArrowRight size={17}/>
                </button>
              </form>
            )}

            {page === 'reset-password' && (
              <form onSubmit={updatePassword}>
                <label>Nova palavra-passe
                  <input
                    type="password"
                    minLength="8"
                    required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo de 8 caracteres"
                  />
                </label>

                <button className="button full" disabled={busy || !configured}>
                  {busy ? 'A atualizar…' : 'Guardar nova palavra-passe'}
                </button>
              </form>
            )}

            {!configured && (
              <p className="inline-warning">
                A autenticação ficará disponível depois de configurar as credenciais do Supabase.
              </p>
            )}

            {message && <p className="feedback">{message}</p>}

            {page === 'login' && (
              <p className="switch-auth">
                Ainda não tem conta?{' '}
                <button onClick={() => go('register')}>Criar conta</button>
              </p>
            )}

            {page === 'register' && (
              <p className="switch-auth">
                Já tem conta?{' '}
                <button onClick={() => go('login')}>Iniciar sessão</button>
              </p>
            )}

            <p className="fine-print">
              Não introduza informação clínica real nesta versão antes da validação de segurança e privacidade.
            </p>
          </div>
        </main>
      )}

      {page === 'dashboard' && (
        <main className="dashboard-wrap">
          <div className="dashboard">
            {!session || !profile ? (
              <div className="auth-card">
                <h2>A carregar a sua área...</h2>
                <p className="muted">
                  {session ? 'Estamos a carregar o seu perfil.' : 'Inicie sessão para continuar.'}
                </p>
                {!session && <button className="button" onClick={() => go('login')}>Entrar</button>}
              </div>
            ) : (
              <>
                <div className="dash-top">
                  <div>
                    <span className="eyebrow">{roles[profile.role]?.label || 'Utilizador'}</span>
                    <h2>Olá, {profile.full_name || session.user.email?.split('@')[0]}.</h2>
                    <p>{roles[profile.role]?.intro}</p>

                    {profile.role === 'professional' && (
                      <p className="muted">
                        Área profissional: {profile.professional_specialty || 'Não indicada'}
                      </p>
                    )}
                  </div>

                  <button className="button secondary" onClick={signOut}>
                    <LogOut size={16}/> Terminar sessão
                  </button>
                </div>

                {profile.role === 'patient' && (
                  <>
                    <div className="notice">
                      <Heart size={18}/>
                      O seu espaço de acompanhamento. Partilhe como se sente e indique aquilo de que precisa.
                    </div>

                    <div className="content-card">
                      <h3><Link2 size={19}/> O seu código de associação</h3>
                      <p>
                        Partilhe este código com os profissionais de saúde e cuidadores que fazem parte da sua equipa.
                      </p>

                      {profile.association_code ? (
                        <div className="association-code">
                          <strong>{profile.association_code}</strong>
                          <button className="button secondary" onClick={() => copyCode(profile.association_code)}>
                            <Copy size={16}/> Copiar código
                          </button>
                        </div>
                      ) : (
                        <p className="muted">O código ainda não está disponível no perfil.</p>
                      )}

                      <p className="fine-print">
                        O código serve para associar contas nesta versão de demonstração.
                      </p>
                    </div>

                    <div className="content-card">
                      <h3><Activity size={19}/> Avaliação de bem-estar</h3>
                      <p className="muted">Registe como se tem sentido. Pode voltar a preencher esta avaliação sempre que necessário.</p>

                      <form onSubmit={saveCheckIn}>
                        <div className="range-grid">
                          {[
                            ['Dor', 'pain'],
                            ['Cansaço', 'fatigue'],
                            ['Falta de ar', 'breathlessness'],
                            ['Náuseas', 'nausea'],
                            ['Dificuldade em dormir', 'sleep'],
                            ['Falta de apetite', 'appetite']
                          ].map(([label, key]) => (
                            <label key={key}>
                              {label}
                              <div className="range-line">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={assessment[key]}
                                  onChange={e => setAssessment({
                                    ...assessment,
                                    [key]: Number(e.target.value)
                                  })}
                                />
                                <b>{assessment[key]}/10</b>
                              </div>
                            </label>
                          ))}
                        </div>

                        <label>Como se sente emocionalmente?
                          <select
                            value={assessment.mood}
                            onChange={e => setAssessment({ ...assessment, mood: e.target.value })}
                          >
                            {[
                              'Tranquilo/a',
                              'Razoavelmente bem',
                              'Ansioso/a',
                              'Triste',
                              'Com medo',
                              'Preocupado/a',
                              'Muito em baixo'
                            ].map(item => <option key={item}>{item}</option>)}
                          </select>
                        </label>

                        <label>Sente que tem apoio emocional suficiente?
                          <select
                            value={assessment.emotionalSupport}
                            onChange={e => setAssessment({ ...assessment, emotionalSupport: e.target.value })}
                          >
                            {['Sim', 'Em parte', 'Não', 'Não sei'].map(item => <option key={item}>{item}</option>)}
                          </select>
                        </label>

                        <label>Como avalia o apoio das pessoas à sua volta?
                          <select
                            value={assessment.socialSupport}
                            onChange={e => setAssessment({ ...assessment, socialSupport: e.target.value })}
                          >
                            {['Adequado', 'Insuficiente', 'Muito insuficiente', 'Não tenho apoio', 'Não se aplica'].map(item => <option key={item}>{item}</option>)}
                          </select>
                        </label>

                        <label>Há alguma preocupação que gostaria de partilhar?
                          <textarea
                            rows="4"
                            value={assessment.notes}
                            onChange={e => setAssessment({ ...assessment, notes: e.target.value })}
                            placeholder="Descreva como se sente ou aquilo de que precisa..."
                          />
                        </label>

                        <button className="button" disabled={busy}>
                          {busy ? 'A guardar…' : 'Guardar avaliação'}
                        </button>
                      </form>
                    </div>

                    <div className="content-card">
                      <h3><TrendingUp size={19}/> Os meus registos recentes</h3>
                      <EvolutionChart records={entries}/>
                    </div>
                  </>
                )}

                {profile.role === 'caregiver' && (
                  <>
                    <div className="notice">
                      <HandHeart size={18}/>
                      Cuidar de alguém também exige cuidado consigo. Este espaço é seu.
                    </div>

                    <div className="content-card">
                      <h3><Users size={19}/> Doente associado</h3>

                      {loadingCaregiverPatient ? (
                        <p className="muted">A carregar o doente associado...</p>
                      ) : caregiverPatient ? (
                        <>
                          <p>Está associado ao seguinte doente:</p>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: 16,
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#fff'
                          }}>
                            <UserRound size={24}/>
                            <div>
                              <strong>{caregiverPatient.full_name || 'Doente sem nome'}</strong>
                              <p className="muted" style={{ margin: '4px 0 0' }}>
                                Código: {caregiverPatient.association_code || 'Não disponível'}
                              </p>
                            </div>
                          </div>
                          <p className="fine-print" style={{ marginTop: 12 }}>
                            Cada cuidador só pode estar associado a um doente. A associação não pode ser alterada nesta área.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>Ainda não está associado a nenhum doente. Introduza o código fornecido pelo doente.</p>
                          <form onSubmit={joinPatient}>
                            <label>Código de associação
                              <input
                                type="text"
                                maxLength="8"
                                minLength="8"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Ex.: ABCD1234"
                                required
                              />
                            </label>
                            <button className="button" disabled={associationBusy}>
                              {associationBusy ? 'A associar…' : 'Associar ao doente'}
                            </button>
                          </form>
                        </>
                      )}
                    </div>

                    <div className="content-card">
                      <h3><Heart size={19}/> Como se tem sentido?</h3>
                      <p className="muted">O seu bem-estar também é importante. Registe as dificuldades e o apoio de que precisa.</p>

                      <form onSubmit={saveCheckIn}>
                        <label>Como avalia o seu bem-estar?
                          <select
                            value={care.wellbeing}
                            onChange={e => setCare({ ...care, wellbeing: e.target.value })}
                          >
                            {['Muito bom', 'Bom', 'Razoável', 'Difícil', 'Muito difícil'].map(item => <option key={item}>{item}</option>)}
                          </select>
                        </label>

                        <label>Que dificuldades tem sentido?
                          <div className="check-grid">
                            {[
                              'Cansaço físico',
                              'Desgaste emocional',
                              'Falta de tempo pessoal',
                              'Conciliar trabalho e cuidados',
                              'Falta de apoio',
                              'Falta de informação',
                              'Dificuldades financeiras',
                              'Dificuldade em gerir tarefas'
                            ].map(item => (
                              <label className="check" key={item}>
                                <input
                                  type="checkbox"
                                  checked={care.difficulties.includes(item)}
                                  onChange={e => setCare({
                                    ...care,
                                    difficulties: e.target.checked
                                      ? [...care.difficulties, item]
                                      : care.difficulties.filter(value => value !== item)
                                  })}
                                />
                                {item}
                              </label>
                            ))}
                          </div>
                        </label>

                        <label>Que tipo de apoio lhe seria mais útil?
                          <div className="check-grid">
                            {[
                              'Apoio emocional',
                              'Apoio psicológico',
                              'Formação sobre cuidados',
                              'Ajuda nas tarefas diárias',
                              'Descanso do cuidador',
                              'Apoio social'
                            ].map(item => (
                              <label className="check" key={item}>
                                <input
                                  type="checkbox"
                                  checked={care.needs.includes(item)}
                                  onChange={e => setCare({
                                    ...care,
                                    needs: e.target.checked
                                      ? [...care.needs, item]
                                      : care.needs.filter(value => value !== item)
                                  })}
                                />
                                {item}
                              </label>
                            ))}
                          </div>
                        </label>

                        <label>Quer acrescentar alguma coisa?
                          <textarea
                            rows="4"
                            value={care.notes}
                            onChange={e => setCare({ ...care, notes: e.target.value })}
                            placeholder="Conte-nos o que precisa..."
                          />
                        </label>

                        <button className="button" disabled={busy}>
                          {busy ? 'A guardar…' : 'Guardar registo'}
                        </button>
                      </form>
                    </div>
                  </>
                )}

                {profile.role === 'professional' && (
                  <>
                    <div className="notice">
                      <Stethoscope size={18}/>
                      Área de acompanhamento profissional e coordenação multidisciplinar.
                    </div>

                    <div className="content-card">
                      <div style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        marginBottom: 18
                      }}>
                        <button
                          className={dashboardTab === 'overview' ? 'button' : 'button secondary'}
                          onClick={() => setDashboardTab('overview')}
                        >
                          <Users size={16}/> Doentes
                        </button>
                        <button
                          className={dashboardTab === 'notes' ? 'button' : 'button secondary'}
                          onClick={() => setDashboardTab('notes')}
                        >
                          <FileText size={16}/> Notas
                        </button>
                        <button
                          className={dashboardTab === 'resources' ? 'button' : 'button secondary'}
                          onClick={() => setDashboardTab('resources')}
                        >
                          <BookOpen size={16}/> Recursos
                        </button>
                      </div>

                      {dashboardTab === 'overview' && (
                        <>
                          <h3><Link2 size={19}/> Associar novo doente</h3>
                          <p>Introduza o código de associação de 8 caracteres fornecido pelo doente. Vários profissionais podem acompanhar o mesmo doente.</p>

                          <form onSubmit={joinPatient}>
                            <label>Código de associação
                              <input
                                type="text"
                                maxLength="8"
                                minLength="8"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Ex.: ABCD1234"
                                required
                              />
                            </label>
                            <button className="button" disabled={associationBusy}>
                              {associationBusy ? 'A associar…' : 'Associar doente'}
                            </button>
                          </form>
                        </>
                      )}
                    </div>

                    {dashboardTab === 'overview' && !selectedPatient && (
                      <div className="content-card">
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap'
                        }}>
                          <h3><Users size={19}/> Os meus doentes ({patients.length})</h3>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={loadPatients}
                            disabled={loadingPatients}
                          >
                            <RefreshCw size={15}/> Atualizar
                          </button>
                        </div>

                        <p className="muted">
                          A lista dá prioridade aos doentes com valores mais elevados no último registo disponível.
                          O indicador é meramente demonstrativo e não constitui triagem clínica.
                        </p>

                        <label style={{ display: 'block', marginTop: 16 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Search size={17}/> Pesquisar doente
                          </span>
                          <input
                            type="search"
                            value={patientSearch}
                            onChange={e => setPatientSearch(e.target.value)}
                            placeholder="Escreva o nome do doente..."
                          />
                        </label>

                        {loadingPatients ? (
                          <p className="muted">A carregar doentes...</p>
                        ) : filteredPatients.length ? (
                          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                            {filteredPatients.map(patient => (
                              <button
                                type="button"
                                key={patient.id}
                                onClick={() => openPatient(patient)}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 12,
                                  textAlign: 'left',
                                  padding: 16,
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 12,
                                  background: '#fff',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  minWidth: 0
                                }}>
                                  <span style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    background: '#f3e8ee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <UserRound size={20}/>
                                  </span>

                                  <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                                    <strong>{patient.full_name || 'Doente sem nome'}</strong>
                                    <small style={{ color: '#6b7280' }}>
                                      Último registo: {patient.lastRecord ? formatDate(patient.lastRecord) : 'Sem registos'}
                                    </small>
                                    <small style={{ color: '#6b7280' }}>
                                      Indicador demonstrativo: {patient.concernScore}/100
                                    </small>
                                  </span>
                                </span>

                                <ArrowRight size={19}/>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="muted" style={{ marginTop: 16 }}>
                            {patients.length
                              ? 'Não foram encontrados doentes com esse nome.'
                              : 'Ainda não tem doentes associados. Introduza um código acima para começar.'}
                          </p>
                        )}
                      </div>
                    )}

                    {dashboardTab === 'overview' && selectedPatient && (
                      <>
                        <div className="content-card">
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => {
                              setSelectedPatient(null);
                              setPatientEntries([]);
                              setViewedEntries({});
                              setMessage('');
                              loadPatients();
                            }}
                          >
                            <ArrowLeft size={16}/> Voltar à lista de doentes
                          </button>

                          <div style={{ marginTop: 22 }}>
                            <span className="eyebrow">Perfil do doente</span>
                            <h2 style={{ marginTop: 8 }}>{selectedPatient.full_name}</h2>
                            <p className="muted">
                              Código de associação: <strong>{selectedPatient.association_code || 'Não disponível'}</strong>
                            </p>

                            <div style={{
                              padding: 14,
                              background: '#f9fafb',
                              borderRadius: 10,
                              marginTop: 14
                            }}>
                              <strong>Indicador demonstrativo de acompanhamento: {latestScore}/100</strong>
                              <p className="muted" style={{ marginBottom: 0 }}>
                                Calculado com base nos valores do último registo do doente. Não é uma avaliação clínica nem substitui julgamento profissional.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="content-card">
                          <h3><TrendingUp size={19}/> Evolução dos registos</h3>
                          <EvolutionChart records={patientEntries}/>
                        </div>

                        <div className="content-card">
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap'
                          }}>
                            <h3><ClipboardList size={19}/> Histórico de registos</h3>
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => openPatient(selectedPatient)}
                              disabled={loadingRecords}
                            >
                              <RefreshCw size={15}/> Atualizar histórico
                            </button>
                          </div>

                          <p className="muted">
                            Registos submetidos pelo doente e pelos cuidadores associados, por ordem cronológica.
                          </p>

                          {loadingRecords ? (
                            <p className="muted">A carregar o histórico...</p>
                          ) : patientEntries.length ? (
                            <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
                              {patientEntries.map(item => {
                                const answers = item.answers || {};
                                const alreadyViewed = Boolean(viewedEntries[item.id]);

                                return (
                                  <article
                                    key={item.id}
                                    style={{
                                      border: '1px solid #e5e7eb',
                                      borderRadius: 12,
                                      padding: 16,
                                      background: '#fff'
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      gap: 12,
                                      flexWrap: 'wrap'
                                    }}>
                                      <div>
                                        <strong>
                                          {item.user_id === selectedPatient.id
                                            ? 'Avaliação de bem-estar · Doente'
                                            : 'Registo do cuidador'}
                                        </strong>
                                        <p className="muted" style={{ margin: '6px 0 0' }}>
                                          <CalendarDays size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }}/>
                                          {formatDate(item.created_at)}
                                        </p>
                                      </div>

                                      {alreadyViewed ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 5,
                                          color: '#15803d',
                                          fontSize: 13,
                                          fontWeight: 600
                                        }}>
                                          <Check size={16}/> Visualizado
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 13, color: '#a16207', fontWeight: 600 }}>
                                          Por visualizar
                                        </span>
                                      )}
                                    </div>

                                    <div style={{
                                      marginTop: 16,
                                      padding: 14,
                                      borderRadius: 8,
                                      background: '#f9fafb',
                                      display: 'grid',
                                      gap: 10
                                    }}>
                                      {Object.entries(answers).map(([key, value]) => {
                                        const labels = {
                                          pain: 'Dor',
                                          fatigue: 'Cansaço',
                                          breathlessness: 'Falta de ar',
                                          nausea: 'Náuseas',
                                          sleep: 'Dificuldade em dormir',
                                          appetite: 'Falta de apetite',
                                          mood: 'Estado emocional',
                                          emotionalSupport: 'Apoio emocional',
                                          socialSupport: 'Apoio social',
                                          notes: 'Observações',
                                          wellbeing: 'Bem-estar',
                                          difficulties: 'Dificuldades',
                                          needs: 'Necessidades'
                                        };

                                        return (
                                          <div key={key}>
                                            <strong style={{ fontSize: 13 }}>{labels[key] || key}</strong>
                                            <p style={{
                                              margin: '4px 0 0',
                                              whiteSpace: 'pre-wrap',
                                              overflowWrap: 'anywhere',
                                              fontSize: 14
                                            }}>
                                              {formatAnswer(value)}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {alreadyViewed && (
                                      <p style={{ color: '#15803d', fontSize: 12, marginTop: 12 }}>
                                        Visualizado em {formatDate(viewedEntries[item.id])}
                                      </p>
                                    )}

                                    {!alreadyViewed && (
                                      <button
                                        type="button"
                                        className="button"
                                        style={{ marginTop: 14 }}
                                        disabled={viewingBusy === item.id}
                                        onClick={() => markAsViewed(item.id)}
                                      >
                                        <Eye size={16}/>
                                        {viewingBusy === item.id ? 'A guardar...' : 'Marcar como visualizado'}
                                      </button>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="muted" style={{ marginTop: 16 }}>
                              Este doente ainda não tem registos submetidos.
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {dashboardTab === 'notes' && (
                      <div className="content-card">
                        <h3><ClipboardList size={19}/> Notas de acompanhamento</h3>
                        <p className="muted">Notas privadas da sua conta profissional nesta demonstração.</p>

                        <form onSubmit={saveProfessionalNote}>
                          <label>Nova nota
                            <textarea
                              rows="5"
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              required
                              placeholder="Registe uma nota de acompanhamento..."
                            />
                          </label>
                          <button className="button" disabled={busy}>
                            <PlusCircle size={16}/> Guardar nota
                          </button>
                        </form>

                        <div style={{ marginTop: 24 }}>
                          <h3>Notas anteriores</h3>
                          {loadingNotes ? (
                            <p className="muted">A carregar notas...</p>
                          ) : professionalNotes.length ? (
                            <div style={{ display: 'grid', gap: 12 }}>
                              {professionalNotes.map(item => (
                                <article key={item.id} style={{
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 10,
                                  padding: 14
                                }}>
                                  <p style={{ whiteSpace: 'pre-wrap' }}>{item.note}</p>
                                  <small className="muted">{formatDate(item.created_at)}</small>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="muted">Ainda não existem notas guardadas.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {dashboardTab === 'resources' && (
                      <div className="content-card">
                        <h3><BookOpen size={19}/> Recursos e informação</h3>
                        <p className="muted">
                          Ligações externas de informação e apoio. Estes recursos não são conteúdos clínicos produzidos pela PallBridge 360.
                        </p>

                        <div style={{ display: 'grid', gap: 14 }}>
                          {resources.map(item => (
                            <article key={item.title} style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: 12,
                              padding: 16
                            }}>
                              <h4 style={{ marginTop: 0 }}>{item.title}</h4>
                              <p className="muted">{item.description}</p>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-button"
                              >
                                Consultar recurso <ExternalLink size={15}/>
                              </a>
                            </article>
                          ))}
                        </div>

                        <p className="fine-print">
                          A área poderá futuramente incluir vídeos educativos e materiais validados por profissionais.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {profile.role !== 'professional' && (
                  <div className="content-card history">
                    <h3><CalendarDays size={19}/> Os meus registos recentes</h3>

                    {entries.length ? (
                      entries.map(item => (
                        <div className="history-row" key={item.id}>
                          <span>{formatDate(item.created_at)}</span>
                          <b>
                            {item.kind === 'patient' ? 'Avaliação de bem-estar' : 'Registo de cuidador'}
                          </b>
                        </div>
                      ))
                    ) : (
                      <p className="muted">Ainda não existem registos.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {message && <p className="feedback">{message}</p>}
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="brand">
          <span className="brand-mark"><Heart size={18}/></span>
          <span>PallBridge <b>360</b></span>
        </div>

        <p>Da pessoa à ação. Em todas as dimensões do cuidado.</p>

        <small>
          Plataforma de apoio à comunicação e continuidade dos cuidados.
          Não substitui avaliação clínica nem serviços de emergência.
          Versão demonstrativa, sem validação clínica.
        </small>
      </footer>
    </div>
  );
}

export default App;
