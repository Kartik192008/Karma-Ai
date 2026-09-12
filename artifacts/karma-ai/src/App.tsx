import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  useGetLearningRecommendations,
  useGenerateQuiz,
  type GeminiChatMessage,
  type LearningRecommendationsResponse,
  type QuizGenerateResponse,
} from '@/lib/api-client-react';
import { setBaseUrl } from '@/lib/api-client-react';

setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? null);
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  FileUp,
  GraduationCap,
  Landmark,
  Lightbulb,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
type ChatMessageItem = GeminiChatMessage & { groundedInMaterial?: boolean };

const ALLOWED_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'html']);
const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'text/xml',
  'application/xml',
]);

function isTextFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return false;
  }
  return true;
}

function unsupportedFileMessage(file: File) {
  return `${file.name} does not appear to be a supported text-based file. Please use TXT, MD, CSV, JSON, or HTML.`;
}

function Home() {
  const [, setLocation] = useLocation();
  const [homePdfOpen, setHomePdfOpen] = useState(false);
  const [homePdfText, setHomePdfText] = useState('');
  const [homeFileError, setHomeFileError] = useState('');

  return (
    <div className="grain min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" data-testid="link-home-logo">
          <KarmaMark size="md" />
          <span className="font-display text-[1.55rem] leading-none tracking-[-0.03em]">KARMA</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <a href="#how-it-works" className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground" data-testid="link-how-it-works">
            How it works
          </a>
          <a href="#built-for-learning" className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground" data-testid="link-built-for-learning">
            Built for learning
          </a>
        </nav>
        <Link href="/chat" className="group inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-primary-foreground shadow-[0_8px_22px_hsl(179_34%_34%_/_0.16)] transition-transform hover:-translate-y-0.5" data-testid="link-header-start">
          Open assistant
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </header>

      <main>
        <section className="relative mx-auto max-w-[1240px] px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pb-28 lg:pt-20">
          <div className="pointer-events-none absolute -right-40 top-0 hidden h-[620px] w-[620px] rounded-full border border-secondary/20 lg:block" />
          <div className="pointer-events-none absolute -right-24 top-16 hidden h-[470px] w-[470px] rounded-full border border-secondary/15 lg:block" />
          <div className="pointer-events-none absolute right-[8.3rem] top-[16rem] hidden h-2 w-2 rounded-full bg-secondary lg:block" />
          <div className="max-w-[760px]">
            <div className="appear-up mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-accent-foreground">
              <span className="size-1.5 rounded-full bg-secondary" />
              Learning intelligence for public service
            </div>
            <h1 className="appear-up appear-up-delay-1 font-display text-[clamp(3.85rem,9vw,7.8rem)] leading-[0.85] tracking-[-0.055em] text-foreground">
              Make sense of<br />
              <span className="italic text-primary">the numbers.</span>
            </h1>
            <p className="appear-up appear-up-delay-2 mt-8 max-w-[560px] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              KARMA is a focused learning companion for India’s Official Statistical System. Ask difficult questions, bring your study material, and leave with a clearer next step.
            </p>
            <div className="appear-up appear-up-delay-3 mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Link href="/chat" className="group inline-flex items-center gap-3 rounded-full bg-secondary px-6 py-3.5 text-sm font-extrabold text-secondary-foreground shadow-[0_10px_30px_hsl(39_84%_59%_/_0.2)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_34px_hsl(39_84%_59%_/_0.3)]" data-testid="link-hero-ask">
                Ask KARMA a question
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/70" data-testid="link-hero-learn-more">
                See how it works
                <ChevronRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="mt-16 grid gap-5 lg:absolute lg:right-10 lg:top-36 lg:mt-0 lg:w-[390px]">
            <AssistantPreview />
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5 text-[0.64rem] font-bold uppercase tracking-[0.15em] text-muted-foreground lg:mt-24 lg:max-w-[730px]" data-testid="text-trust-line">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3.5 text-primary" /> Context-aware answers</span>
            <span className="inline-flex items-center gap-2"><Landmark className="size-3.5 text-primary" /> For India’s statistical system</span>
            <span className="inline-flex items-center gap-2"><BookOpen className="size-3.5 text-primary" /> Learn at your pace</span>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-[hsl(39_28%_88%_/_0.32)]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-10 lg:py-28">
            <div>
              <p className="font-mono-label text-[0.63rem] font-medium uppercase text-primary">01 / A better study loop</p>
              <h2 className="mt-5 max-w-[430px] font-display text-5xl leading-[0.93] tracking-[-0.04em] sm:text-6xl">From dense material to a useful next step.</h2>
              <p className="mt-6 max-w-[390px] text-sm leading-7 text-muted-foreground">No wandering through a general-purpose chatbot. KARMA keeps the exchange close to your learning goal and the material in front of you.</p>
              <Link href="/chat" className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:text-primary/70" data-testid="link-loop-start">
                Try the learning loop <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              <ProcessStep number="01" icon={<FileUp />} title="Bring your context" body="Attach a text-based note, circular, or study extract. KARMA reads it on your device before using it as context." />
              <ProcessStep number="02" icon={<CircleHelp />} title="Ask the real question" body="Ask for an explanation, an example, a comparison, or a way to remember what matters." />
              <ProcessStep number="03" icon={<Target />} title="Leave with direction" body="Get a clear answer grounded in your material, plus a practical next step for learning or applying it." />
            </div>
          </div>
        </section>

        <section id="built-for-learning" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="font-mono-label text-[0.63rem] font-medium uppercase text-primary">02 / Designed for the work</p>
              <h2 className="mt-5 max-w-[610px] font-display text-5xl leading-[0.93] tracking-[-0.04em] sm:text-7xl">Clearer thinking is a capability.</h2>
            </div>
            <p className="max-w-[360px] pb-1 text-sm leading-7 text-muted-foreground">Whether you are preparing for an induction programme or refreshing a digital skill, the goal stays the same: confidence you can carry into the work.</p>
          </div>
          <div className="mt-14 grid gap-3 md:grid-cols-3">
            <FeatureCard index="A" icon={<BrainCircuit />} title="Explain, don't impress" body="Plain-language answers that respect the subject and your time." />
            <FeatureCard index="B" icon={<Lightbulb />} title="Connect the dots" body="See how definitions, processes, and digital tools relate to the bigger system." />
            <FeatureCard index="C" icon={<GraduationCap />} title="Keep moving" body="Turn an answer into a question worth asking next, a concept worth revisiting." />
          </div>
        </section>

        <section id="mospi-dataset" className="border-y border-border bg-[hsl(218_28%_92%_/_0.35)]">
          <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <p className="font-mono-label text-[0.63rem] font-medium uppercase text-primary">03 / Official data</p>
                <h2 className="mt-5 font-display text-5xl leading-[0.93] tracking-[-0.04em] sm:text-6xl">Work with a real MoSPI dataset.</h2>
                <p className="mt-5 max-w-[460px] text-sm leading-7 text-muted-foreground">
                  Use the sample PLFS extract to explore how KARMA grounds answers in official microdata. Open the source catalog entry or preview the file content directly.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="https://www.mospi.gov.in/themes/product/69-periodic-labour-force-survey-plfs"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-primary-foreground shadow-[0_8px_22px_hsl(179_34%_34%_/_0.16)] transition-transform hover:-translate-y-0.5"
                    data-testid="link-mospi-catalog"
                  >
                    Open MoSPI source <ArrowUpRight className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch('/mospi-plfs-sample.csv');
                        const text = await response.text();
                        setHomePdfText(text);
                        setHomePdfOpen(true);
                      } catch (error) {
                        setHomeFileError('Could not load demo file.');
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-foreground transition-colors hover:border-primary/30"
                    data-testid="button-view-dataset"
                  >
                    View dataset content
                  </button>
                </div>
                {homeFileError && <p className="mt-2 text-xs text-destructive" role="alert">{homeFileError}</p>}
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Landmark className="size-3.5 text-primary" />
                  <span>Source: MoSPI Microdata catalog ID 284 · PLFS household extract</span>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_hsl(218_34%_17%_/_0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Demo file</p>
                    <p className="mt-1 text-sm font-extrabold">mospi-plfs-sample.csv</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary"><FileText className="size-4" /></span>
                </div>
                <div className="mt-5 space-y-2 text-xs leading-6 text-muted-foreground">
                  <p>Household-level extract with employment status, sector, income, and demographic fields.</p>
                  <p>Use it to test explanations, quiz generation, and learning recommendations.</p>
                </div>
                <div className="mt-5 rounded-xl border border-border bg-background p-4">
                  <p className="font-mono-label text-[0.59rem] uppercase text-primary">Preview</p>
                  <p className="mt-2 font-mono text-[0.7rem] leading-6 text-muted-foreground">state, district, rural_urban, age, sex, education_level, employment_status ...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-9 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:px-10 lg:py-20">
            <div>
              <p className="font-mono-label text-[0.63rem] font-medium uppercase text-primary-foreground/60">Ready when you are</p>
              <h2 className="mt-4 max-w-[600px] font-display text-5xl leading-[0.9] tracking-[-0.04em] sm:text-6xl">Start with the question you keep postponing.</h2>
            </div>
            <Link href="/chat" className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-secondary px-6 py-3.5 text-sm font-extrabold text-secondary-foreground transition-transform hover:-translate-y-1" data-testid="link-bottom-start">
              Open KARMA AI
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span className="inline-flex items-center gap-2"><KarmaMark size="sm" /> KARMA AI</span>
        <span>Learning intelligence for public service</span>
        <button type="button" onClick={() => setLocation('/chat')} className="text-left text-primary hover:text-primary/70 sm:text-right" data-testid="button-footer-assistant">Go to assistant <span aria-hidden="true">↗</span></button>
      </footer>

      {homePdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setHomePdfOpen(false)}>
          <div className="w-full max-w-[760px] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4 backdrop-blur-md">
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-[-0.03em]">mospi-plfs-sample.csv</h2>
                <p className="text-xs text-muted-foreground">MoSPI PLFS household extract</p>
              </div>
              <button type="button" onClick={() => setHomePdfOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-primary" aria-label="Close dataset viewer"><X className="size-4" /></button>
            </div>
            <div className="p-5">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-muted-foreground">{homePdfText}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KarmaMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const imageSize = size === 'md' ? 36 : 20;
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${size === 'md' ? 'size-9' : 'size-5'}`} aria-hidden="true">
      <img src="/logo.jpeg" alt="KARMA AI" width={imageSize} height={imageSize} className="object-cover" />
    </span>
  );
}

function AssistantPreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-primary/20 bg-primary p-5 text-primary-foreground shadow-[0_22px_60px_hsl(218_34%_17%_/_0.14)] sm:p-6">
      <div className="absolute -right-12 -top-12 size-40 rounded-full border border-primary-foreground/10" />
      <div className="absolute -right-5 top-5 size-24 rounded-full border border-secondary/25" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <KarmaMark size="sm" />
          <span className="text-xs font-bold tracking-[0.02em]">KARMA AI</span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono-label text-[0.56rem] uppercase text-primary-foreground/60"><span className="size-1.5 rounded-full bg-secondary" /> ready</span>
      </div>
      <div className="relative mt-9 space-y-3">
        <div className="ml-auto max-w-[83%] rounded-2xl rounded-br-sm bg-primary-foreground/10 px-3.5 py-3 text-[0.74rem] leading-5 text-primary-foreground/90">What is the difference between a census and a sample survey?</div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-background px-3.5 py-3 text-[0.74rem] leading-5 text-foreground">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-primary"><Sparkles className="size-3" /> In brief</span>
          <p>A census studies every unit in a population. A sample survey studies a carefully chosen part, then uses it to understand the whole.</p>
        </div>
        <div className="flex items-center gap-2 border-t border-primary-foreground/10 pt-4 text-[0.61rem] font-semibold text-primary-foreground/55"><BookOpen className="size-3.5" /> Ask about your material</div>
      </div>
    </div>
  );
}

function ProcessStep({ number, icon, title, body }: { number: string; icon: ReactNode; title: string; body: string }) {
  return (
    <div className="group flex gap-4 rounded-2xl border border-border bg-card p-5 transition-transform hover:-translate-y-0.5 sm:gap-6 sm:p-6">
      <div className="flex shrink-0 flex-col items-center gap-3">
        <span className="font-mono-label text-[0.59rem] text-secondary-foreground">{number}</span>
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-secondary"><span className="[&>svg]:size-4">{icon}</span></span>
      </div>
      <div>
        <h3 className="text-base font-extrabold tracking-[-0.02em]">{title}</h3>
        <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function FeatureCard({ index, icon, title, body }: { index: string; icon: ReactNode; title: string; body: string }) {
  return (
    <div className="group min-h-[230px] rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30 hover:bg-accent sm:p-7">
      <div className="flex items-center justify-between">
        <span className="font-mono-label text-[0.6rem] text-primary">{index}</span>
        <span className="text-primary transition-transform group-hover:rotate-[-8deg]"><span className="[&>svg]:size-5">{icon}</span></span>
      </div>
      <div className="mt-20">
        <h3 className="text-lg font-extrabold tracking-[-0.025em]">{title}</h3>
        <p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Chat() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [message, setMessage] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [fileError, setFileError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [submittedRecommendationQuery, setSubmittedRecommendationQuery] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'aiml' | 'huggingface'>('gemini');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [isSending, setIsSending] = useState(false);
  const [quiz, setQuiz] = useState<QuizGenerateResponse | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [mospiQuery, setMospiQuery] = useState('');
  const [mospiResults, setMospiResults] = useState<Array<{ id: string; title: string; description: string | null }>>([]);
  const [mospiLoading, setMospiLoading] = useState(false);
  const [mospiError, setMospiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recommendations = useGetLearningRecommendations(
    { query: submittedRecommendationQuery || 'statistics', limit: 6 },
    {
      query: {
        enabled: Boolean(submittedRecommendationQuery),
        retry: 1,
        queryKey: ['official-recommendations', submittedRecommendationQuery],
      },
    },
  );
  const generateQuizMutation = useGenerateQuiz();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileError('');
    if (!isTextFile(file)) {
      setFileError(unsupportedFileMessage(file));
      return;
    }
    setIsReading(true);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setFileError('This material appears to be empty. Try another file.');
        return;
      }
      setMaterialText(text.slice(0, 50000));
      setMaterialName(file.name.slice(0, 200));
    } catch {
      setFileError('We could not read that file in your browser. Try saving it as plain text.');
    } finally {
      setIsReading(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setFileError('');
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const quizIntent = /quiz|generate.*quiz|create.*quiz|practice.*questions/i.test(trimmed);
    if (quizIntent && materialText) {
      handleGenerateQuiz();
      setMessage('');
      return;
    }

    setRequestError('');
    const history = messages.slice(-20).map(({ role, content }) => ({ role, content }));
    const userMessage: GeminiChatMessage = { role: 'user', content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setIsSending(true);

    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    fetch(`${apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        history,
        materialText: materialText || null,
        materialName: materialName || null,
        provider,
        model,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'KARMA could not answer just now. Please try again.');
        }
        setMessages((current) => [...current, { role: 'assistant', content: data.message, groundedInMaterial: data.groundedInMaterial }]);
      })
      .catch((error) => {
        setRequestError(error instanceof Error ? error.message : 'KARMA could not answer just now. Please try again.');
      })
      .finally(() => {
        setIsSending(false);
      });
  };

  const startFresh = () => {
    setMessages([]);
    setMessage('');
    setMaterialText('');
    setMaterialName('');
    setRequestError('');
  };

  const submitRecommendationSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = recommendationQuery.trim();
    if (trimmed.length >= 2) {
      setSubmittedRecommendationQuery(trimmed);
    }
  };

  const handleGenerateQuiz = () => {
    setQuizError('');
    setQuizSubmitted(false);
    setQuizAnswers({});
    setIsGeneratingQuiz(true);
    generateQuizMutation.mutate(
      { data: {
        materialText: materialText || null,
        materialName: materialName || null,
        message: message.trim() || 'Generate a quiz based on the attached material',
        provider,
        model,
      }},
      {
        onSuccess: (data) => {
          setQuiz(data);
          setQuizOpen(true);
        },
        onError: (error) => {
          setQuizError(error instanceof Error ? error.message : 'Could not generate quiz. Please try again.');
        },
        onSettled: () => {
          setIsGeneratingQuiz(false);
        },
      },
    );
  };

  const handleQuizAnswer = (questionId: number, optionIndex: number) => {
    setQuizAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
  };

  const handleQuizClose = () => {
    setQuizOpen(false);
    setQuiz(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizError('');
  };

  const quizScore = quiz
    ? quiz.quiz.questions.reduce((acc, q) => (quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc), 0)
    : 0;

  const searchMospiDatasets = async () => {
    const trimmed = mospiQuery.trim();
    if (trimmed.length < 2) return;
    setMospiLoading(true);
    setMospiError('');
    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/datasets/search?query=${encodeURIComponent(trimmed)}&limit=6`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'MoSPI search failed');
      }
      setMospiResults(data.datasets || []);
    } catch (error) {
      setMospiError(error instanceof Error ? error.message : 'Could not search MoSPI datasets.');
    } finally {
      setMospiLoading(false);
    }
  };

  const loadMospiDataset = async (datasetId: string, title: string) => {
    setMospiError('');
    setMospiLoading(true);
    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/datasets/${encodeURIComponent(datasetId)}/fileslist`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not load dataset');
      }
      const files = Array.isArray(data.files) ? data.files : [];
      if (files.length === 0) {
        throw new Error('No files found in this dataset');
      }
      const firstFile = files[0];
      if (!firstFile.base64) {
        throw new Error('File data not available');
      }
      const binaryString = atob(firstFile.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const text = new TextDecoder().decode(bytes);
      setMaterialText(text.slice(0, 50000));
      setMaterialName(firstFile.name || title);
    } catch (error) {
      setMospiError(error instanceof Error ? error.message : 'Could not load dataset. Try again.');
    } finally {
      setMospiLoading(false);
    }
  };

  return (
    <div className="grain flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-card/70 px-4 backdrop-blur-md sm:px-7">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-chat-logo"><KarmaMark size="sm" /><span className="font-display text-xl tracking-[-0.03em]">KARMA</span></Link>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden text-[0.64rem] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:block">Learning assistant</span>
          <select
            value={provider}
            onChange={(event) => {
              const next = event.target.value as 'gemini' | 'groq' | 'aiml' | 'huggingface';
              setProvider(next);
              setModel(next === 'groq' ? 'llama-3.1-70b-versatile' : next === 'aiml' ? 'mistralai/mistral-7b-instruct' : next === 'huggingface' ? 'google/gemma-2-9b-it' : 'gemini-3.6-flash');
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            data-testid="select-provider"
          >
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="aiml">AIML Mistral</option>
            <option value="huggingface">HuggingFace</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={startFresh} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary" data-testid="button-new-conversation"><Plus className="size-3.5" /> <span className="hidden sm:inline">New conversation</span></button>
          <button type="button" onClick={() => setSidebarOpen((current) => !current)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-primary md:hidden" aria-label="Toggle learning material panel" data-testid="button-toggle-sidebar"><Paperclip className="size-4" /></button>
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <aside className={`${sidebarOpen ? 'absolute inset-x-0 top-0 z-20 block shadow-xl' : 'hidden'} border-b border-border bg-card md:relative md:block md:w-[274px] md:shrink-0 md:border-b-0 md:border-r md:shadow-none`}>
          <div className="flex h-full flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between md:block">
              <div>
                <p className="font-mono-label text-[0.59rem] font-medium uppercase text-primary">Your study desk</p>
                <h2 className="mt-2 text-lg font-extrabold tracking-[-0.03em]">Learning context</h2>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden" aria-label="Close learning material panel" data-testid="button-close-sidebar"><X className="size-4" /></button>
            </div>
            <div className="mt-7 rounded-2xl border border-dashed border-primary/30 bg-accent/50 p-4">
              <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.html,text/plain,text/markdown,text/csv,application/json,text/html" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} data-testid="input-material-file" />
              {materialName ? (
                <div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FileText className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold" data-testid="text-material-name">{materialName}</p>
                      <p className="mt-1 font-mono-label text-[0.57rem] uppercase text-primary">Attached · {Math.round(materialText.length / 1000)}k chars</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setMaterialName(''); setMaterialText(''); }} className="mt-4 inline-flex items-center gap-1.5 text-[0.65rem] font-bold text-muted-foreground hover:text-destructive" data-testid="button-remove-material"><X className="size-3" /> Remove material</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-start text-left" data-testid="button-upload-material">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FileUp className="size-4" /></span>
                  <span className="mt-4 text-sm font-extrabold">{isReading ? 'Reading material…' : 'Attach study material'}</span>
                  <span className="mt-1 text-xs leading-5 text-muted-foreground">TXT, MD, CSV, JSON or HTML. Read locally, then shared as context.</span>
                </button>
              )}
              {!materialName && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await fetch('/mospi-plfs-sample.csv');
                      const text = await response.text();
                      setMaterialText(text.slice(0, 50000));
                      setMaterialName('mospi-plfs-sample.csv');
                    } catch (error) {
                      setFileError('Could not load demo file. Please try uploading manually.');
                    }
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  data-testid="button-load-demo-data"
                >
                  <FileText className="size-3.5" />
                  Load demo PLFS data
                </button>
              )}
            </div>
            {fileError && <p className="mt-3 text-xs leading-5 text-destructive" role="alert" data-testid="status-file-error">{fileError}</p>}
            <div className="mt-5 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono-label text-[0.59rem] font-medium uppercase text-primary">MoSPI datasets</p>
                  <h3 className="mt-1 text-sm font-extrabold tracking-[-0.03em]">Browse official data</h3>
                </div>
                <Landmark className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Search MoSPI microdata surveys and attach one for analysis.</p>
              <form onSubmit={(e) => { e.preventDefault(); void searchMospiDatasets(); }} className="mt-3 flex gap-2" data-testid="form-mospi-search">
                <input
                  value={mospiQuery}
                  onChange={(event) => setMospiQuery(event.target.value)}
                  placeholder="e.g. labour force survey"
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/50"
                  data-testid="input-mospi-query"
                />
                <button
                  type="submit"
                  disabled={mospiQuery.trim().length < 2 || mospiLoading}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Search MoSPI datasets"
                  data-testid="button-search-mospi"
                >
                  <Search className="size-3.5" />
                </button>
              </form>
              {mospiLoading && <p className="mt-2 text-xs text-muted-foreground" role="status" data-testid="status-mospi-loading">Searching MoSPI catalogue…</p>}
              {mospiError && <p className="mt-2 text-xs leading-5 text-destructive" role="alert" data-testid="status-mospi-error">{mospiError}</p>}
              {mospiResults.length > 0 && (
                <div className="mt-3 space-y-2" data-testid="mospi-results">
                  {mospiResults.map((dataset) => (
                    <button
                      key={dataset.id}
                      type="button"
                      onClick={() => loadMospiDataset(dataset.id, dataset.title)}
                      disabled={mospiLoading}
                      className="w-full rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <p className="text-xs font-extrabold leading-5">{dataset.title}</p>
                      {dataset.description && <p className="mt-1 line-clamp-2 text-[0.68rem] leading-5 text-muted-foreground">{dataset.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <OfficialRecommendations
              query={recommendationQuery}
              submittedQuery={submittedRecommendationQuery}
              response={recommendations.data}
              isLoading={recommendations.isLoading}
              error={recommendations.error}
              onQueryChange={setRecommendationQuery}
              onSubmit={submitRecommendationSearch}
            />
            <div className="mt-auto hidden border-t border-border pt-5 md:block">
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-[0.68rem] leading-5">Use KARMA to understand and practise. Verify important decisions with your official source.</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col px-4 sm:px-8">
            {messages.length === 0 ? (
              <EmptyChat onPrompt={(prompt) => setMessage(prompt)} />
            ) : (
              <div className="flex-1 space-y-7 py-8 sm:py-12">
                {messages.map((item, index) => <ChatMessage key={`${item.role}-${index}`} item={item} />)}
                {isSending && <TypingMessage />}
                {requestError && (
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive" role="alert" data-testid="status-chat-error">
                    <CircleHelp className="mt-0.5 size-4 shrink-0" />
                    <div className="flex-1"><p>{requestError}</p><button type="button" onClick={() => setRequestError('')} className="mt-2 font-bold underline underline-offset-2" data-testid="button-dismiss-error">Dismiss</button></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
            <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background to-transparent pb-5 pt-5 sm:pb-8">
              {materialName && <div className="mb-2 flex items-center gap-2 px-3 text-[0.62rem] font-semibold text-primary"><Paperclip className="size-3.5" /> Answers can refer to {materialName}</div>}
              <form onSubmit={submitQuestion} className="relative rounded-2xl border border-border bg-card p-2 shadow-[0_12px_35px_hsl(218_34%_17%_/_0.07)] transition-colors focus-within:border-primary/45" data-testid="form-chat">
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask KARMA about a concept, process, or skill…" rows={2} className="w-full resize-none bg-transparent px-3 py-2.5 pr-24 text-sm leading-6 outline-none placeholder:text-muted-foreground/70" aria-label="Your question" data-testid="input-chat-message" />
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button type="button" onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || (!materialText && !message.trim())} className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary transition-all hover:bg-accent/70 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Generate quiz" data-testid="button-generate-quiz" title="Generate quiz from material">
                    {isGeneratingQuiz ? <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <BrainCircuit className="size-4" />}
                  </button>
                  <button type="submit" disabled={!message.trim() || isSending} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Send question" data-testid="button-send-message"><Send className="size-4" /></button>
                </div>
              </form>
              {quizError && <p className="mt-2 text-xs text-destructive" role="alert" data-testid="status-quiz-error">{quizError}</p>}
              <p className="mt-2 text-center text-[0.6rem] text-muted-foreground">KARMA can make mistakes. Use your official materials as the final source of truth.</p>
            </div>
          </div>
        </main>
      </div>
      <QuizModal
        quiz={quiz}
        open={quizOpen}
        onClose={handleQuizClose}
        answers={quizAnswers}
        onAnswer={handleQuizAnswer}
        submitted={quizSubmitted}
        onSubmit={handleQuizSubmit}
        score={quizScore}
      />
    </div>
  );
}

function QuizModal({ quiz, open, onClose, answers, onAnswer, submitted, onSubmit, score }: {
  quiz: QuizGenerateResponse | null;
  open: boolean;
  onClose: () => void;
  answers: Record<number, number>;
  onAnswer: (questionId: number, optionIndex: number) => void;
  submitted: boolean;
  onSubmit: () => void;
  score: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [courseQuery, setCourseQuery] = useState('');
  const [submittedCourseQuery, setSubmittedCourseQuery] = useState('');
  const recommendations = useGetLearningRecommendations(
    { query: submittedCourseQuery || 'statistics', limit: 6 },
    {
      query: {
        enabled: Boolean(submittedCourseQuery),
        retry: 1,
        queryKey: ['quiz-recommendations', submittedCourseQuery],
      },
    },
  );

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setShowResults(false);
      setRoadmap(null);
      setCourseQuery('');
      setSubmittedCourseQuery('');
    }
  }, [open]);

  if (!open || !quiz) return null;

  const question = quiz.quiz.questions[currentIndex];
  const total = quiz.quiz.questions.length;
  const wrongQuestions = quiz.quiz.questions.filter((q) => answers[q.id] !== q.correctIndex);
  const skillGaps = wrongQuestions.map((q) => q.question);

  const generateRoadmap = () => {
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);
    const weakAreas = skillGaps.length ? skillGaps.slice(0, 3).join('; ') : 'none detected';
    setRoadmap(
      `You scored ${score}/${total} (${percent}%). Focus first on: ${weakAreas}. After that, revise the correct answers and retake the quiz to strengthen recall.`,
    );
  };

  const handleSubmitQuiz = () => {
    onSubmit();
    setShowResults(true);
    generateRoadmap();
  };

  const submitCourseSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = courseQuery.trim();
    if (trimmed.length >= 2) {
      setSubmittedCourseQuery(trimmed);
    }
  };

  const handleClose = () => {
    onClose();
    setShowResults(false);
    setRoadmap(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4 backdrop-blur-md">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-[-0.03em]">{quiz.quiz.title}</h2>
            <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {total}</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-primary" aria-label="Close quiz"><X className="size-4" /></button>
        </div>

        <div className="p-5">
          {!showResults ? (
            <div>
              {question && (
                <div>
                  <div className="mb-4">
                    <p className="text-sm font-extrabold leading-7">{question.question}</p>
                  </div>
                  <div className="space-y-2.5">
                    {question.options.map((option, index) => {
                      const isSelected = answers[question.id] === index;
                      const isCorrect = index === question.correctIndex;
                      const showResult = submitted;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => !submitted && onAnswer(question.id, index)}
                          disabled={submitted}
                          className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                            showResult && isCorrect
                              ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                              : showResult && isSelected && !isCorrect
                                ? 'border-destructive/50 bg-destructive/10 text-destructive'
                                : isSelected
                                  ? 'border-primary bg-accent'
                                  : 'border-border bg-background hover:border-primary/30'
                          } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full border border-current text-xs font-bold">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                          {showResult && isCorrect && <Check className="ml-auto size-4 text-green-600" />}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && question.explanation && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-accent/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Explanation</p>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{question.explanation}</p>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      disabled={currentIndex === 0}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="text-xs text-muted-foreground">
                      {submitted && `${score} / ${total} correct`}
                    </span>

                    {currentIndex < total - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-secondary-foreground"
                      >
                        {submitted ? 'Finish' : 'Submit Quiz'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-extrabold">Quiz complete</p>
                <p className="mt-1 text-xs text-muted-foreground">You scored {score} out of {total}.</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Skill gap check</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {skillGaps.length === 0
                    ? 'No clear skill gaps detected from this quiz.'
                    : `Review these areas: ${skillGaps.join('; ')}`}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Personalized roadmap</p>
                {!roadmap ? (
                  <button type="button" onClick={generateRoadmap} className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Generate roadmap</button>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{roadmap}</p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">iGOT Karmayogi course match</p>
                <form onSubmit={submitCourseSearch} className="mt-3 flex gap-2" data-testid="form-quiz-courses">
                  <input
                    value={courseQuery}
                    onChange={(event) => setCourseQuery(event.target.value)}
                    placeholder="Search a topic like NSS, CPI, or digital governance"
                    maxLength={200}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/50"
                    data-testid="input-quiz-course-query"
                  />
                  <button
                    type="submit"
                    disabled={courseQuery.trim().length < 2 || recommendations.isLoading}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Search courses"
                    data-testid="button-search-quiz-courses"
                  >
                    <Search className="size-3.5" />
                  </button>
                </form>
                {recommendations.isLoading && <p className="mt-2 text-xs text-muted-foreground">Searching courses…</p>}
                {recommendations.error && <p className="mt-2 text-xs text-destructive">Could not load courses.</p>}
                {recommendations.data && recommendations.data.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2" data-testid="quiz-course-results">
                    {recommendations.data.recommendations.map((item) => (
                      <a
                        key={item.id}
                        href={item.destinationUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/30"
                      >
                        <p className="text-xs font-extrabold leading-5">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[0.68rem] leading-5 text-muted-foreground">{item.summary}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-end">
                <button type="button" onClick={handleClose} className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-secondary-foreground">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OfficialRecommendations({
  query,
  submittedQuery,
  response,
  isLoading,
  error,
  onQueryChange,
  onSubmit,
}: {
  query: string;
  submittedQuery: string;
  response?: LearningRecommendationsResponse;
  isLoading: boolean;
  error: Error | null;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mt-7 border-t border-border pt-5" aria-labelledby="official-recommendations-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono-label text-[0.59rem] font-medium uppercase text-primary">Official catalogue</p>
          <h2 id="official-recommendations-title" className="mt-2 text-base font-extrabold tracking-[-0.03em]">Find your next step</h2>
        </div>
        <BookOpen className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Search live metadata from iGOT Karmayogi, NSSTA, and MoSPI. KARMA never fills gaps with made-up courses or datasets.</p>
      <form onSubmit={onSubmit} className="mt-4 flex gap-2" data-testid="form-recommendations">
        <label htmlFor="recommendation-query" className="sr-only">Learning topic</label>
        <input
          id="recommendation-query"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="e.g. sample surveys"
          maxLength={200}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/50"
          data-testid="input-recommendation-query"
        />
        <button
          type="submit"
          disabled={query.trim().length < 2 || isLoading}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Search official catalogues"
          data-testid="button-search-recommendations"
        >
          <Search className="size-3.5" />
        </button>
      </form>
      {isLoading && <p className="mt-3 text-xs text-muted-foreground" role="status" data-testid="status-recommendations-loading">Checking official catalogues…</p>}
      {error && <p className="mt-3 text-xs leading-5 text-destructive" role="alert" data-testid="status-recommendations-error">The official catalogues could not be reached. Try again later.</p>}
      {response && !isLoading && (
        <div className="mt-4 space-y-3" data-testid="recommendations-results">
          <div className="flex flex-wrap gap-1.5">
            {response.sources.map((source) => (
              <span
                key={source.id}
                className={`rounded-full px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.08em] ${source.status === 'available' ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}
                title={source.message ?? `${source.name} is available`}
                data-testid={`status-source-${source.id}`}
              >
                {source.name} · {source.status}
              </span>
            ))}
          </div>
          {response.recommendations.length > 0 ? (
            response.recommendations.map((recommendation) => (
              <article key={`${recommendation.source}-${recommendation.id}`} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono-label text-[0.55rem] font-medium uppercase text-primary">{recommendation.sourceName} · {recommendation.type}</span>
                  <span className="shrink-0 text-[0.58rem] font-bold text-secondary-foreground">{recommendation.relevance}% match</span>
                </div>
                <h3 className="mt-2 text-xs font-extrabold leading-5">{recommendation.title}</h3>
                <p className="mt-1 line-clamp-3 text-[0.68rem] leading-5 text-muted-foreground">{recommendation.summary}</p>
                {(recommendation.provider || recommendation.duration || recommendation.schedule) && (
                  <p className="mt-2 text-[0.6rem] leading-4 text-muted-foreground">
                    {[recommendation.provider, recommendation.duration, recommendation.schedule].filter(Boolean).join(' · ')}
                  </p>
                )}
                <a
                  href={recommendation.destinationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center text-[0.62rem] font-bold text-primary underline-offset-2 hover:underline"
                  data-testid={`link-recommendation-${recommendation.source}-${recommendation.id}`}
                >
                  Open official details <ArrowUpRight className="ml-1 size-3" />
                </a>
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground" data-testid="status-recommendations-empty">
              No matching official items were returned for “{submittedQuery}”. Try a broader competency or topic.
            </p>
          )}
          {response.catalogueStatus !== 'available' && (
            <p className="text-[0.62rem] leading-5 text-muted-foreground" data-testid="status-recommendations-partial">
              {response.catalogueStatus === 'unavailable'
                ? 'All official catalogues are unavailable right now; showing prototype datasets where available.'
                : 'One or more official catalogues are unavailable; the results above only come from the sources that responded.'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function EmptyChat({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const prompts = [
    'Explain the difference between a census and a sample survey.',
    'Help me understand what a metadata standard does.',
    'Give me a simple way to remember the data lifecycle.',
  ];

  return (
    <div className="flex flex-1 flex-col justify-center py-12 sm:py-20">
      <div className="appear-up">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-secondary shadow-[0_10px_28px_hsl(179_34%_34%_/_0.2)]"><Sparkles className="size-6" /></div>
        <p className="mt-8 font-mono-label text-[0.62rem] font-medium uppercase text-primary">Your learning companion</p>
        <h1 className="mt-3 max-w-[650px] font-display text-5xl leading-[0.92] tracking-[-0.045em] sm:text-7xl">What would you like to make clearer?</h1>
        <p className="mt-6 max-w-[500px] text-sm leading-7 text-muted-foreground sm:text-base">Ask KARMA a question about official statistics, digital skills, or the material you are working through.</p>
      </div>
      <div className="mt-12 grid gap-2 sm:max-w-[670px]">
        <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">Start with a prompt</p>
        {prompts.map((prompt, index) => (
          <button type="button" key={prompt} onClick={() => onPrompt(prompt)} className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm transition-colors hover:border-primary/30 hover:bg-accent" data-testid={`button-starter-prompt-${index}`}>
            <span>{prompt}</span><ArrowUpRight className="size-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ item }: { item: ChatMessageItem }) {
  const isUser = item.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`} data-testid={`message-${item.role}`}>
      {!isUser && <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-secondary"><Sparkles className="size-3.5" /></span>}
      <div className={`${isUser ? 'max-w-[78%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground' : 'max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3.5'} text-sm leading-7`}>
        {!isUser && <p className="mb-1.5 flex items-center gap-2 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-primary">KARMA AI {item.groundedInMaterial && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] tracking-[0.08em] text-accent-foreground"><Check className="size-2.5" /> material</span>}</p>}
        <p className="whitespace-pre-wrap">{item.content}</p>
      </div>
    </div>
  );
}

function TypingMessage() {
  return (
    <div className="flex gap-3" data-testid="status-chat-loading">
      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-secondary"><Sparkles className="size-3.5" /></span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-card px-5 py-4">
        <span className="typing-dot size-1.5 rounded-full bg-primary" />
        <span className="typing-dot size-1.5 rounded-full bg-primary" />
        <span className="typing-dot size-1.5 rounded-full bg-primary" />
        <span className="sr-only">KARMA is thinking</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chat" component={Chat} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
