import type { LabRunResult, PaymentMode } from "./types";

export interface LessonMode {
  title: string;
  mechanism: string;
  promise: string;
  explanation: string;
  limitation: string;
  interviewLine: string;
  codeLanguage: string;
  code: string;
}

export interface StoryStep {
  label: string;
  title: string;
  explanation: string;
  focus: "customer" | "api" | "database" | "provider" | "result";
  tone: "neutral" | "danger" | "success";
}

export const lessonModes: Record<PaymentMode, LessonMode> = {
  unprotected: {
    title: "Korumasız",
    mechanism: "Her istek bağımsız çalışır",
    promise: "Problemi görünür kılar",
    explanation:
      "API iki HTTP isteğini iki ayrı iş olarak kabul eder. İkisi de ödeme sağlayıcısına ulaşır.",
    limitation:
      "Retry, çift tıklama veya ağ tekrarında aynı business operation yeniden çalışır.",
    interviewLine:
      "HTTP request sayısını değil, business operation kimliğini tekilleştirmeliyiz.",
    codeLanguage: "csharp",
    code: `// İki istek de bu satıra ulaşır.
var charge = await provider.ChargeAsync(payment);
await InsertPaymentAsync(charge);`,
  },
  "database-constraint": {
    title: "Database guard",
    mechanism: "Unique index bir sahip seçer",
    promise: "Aynı intent için tek charge",
    explanation:
      "İki istek aynı kaydı eklemeye çalışır. PostgreSQL unique index yalnızca birine izin verir.",
    limitation:
      "Duplicate istek önceki HTTP cevabını otomatik olarak alamaz; bu nedenle tam bir idempotent API sözleşmesi değildir. Pending kayıt ve crash recovery ayrıca tasarlanmalıdır.",
    interviewLine:
      "Unique constraint son savunma hattıdır; fakat tek başına tam bir idempotent API sözleşmesi değildir.",
    codeLanguage: "sql",
    code: `CREATE UNIQUE INDEX ux_payment_intent
ON payments (payment_intent_id);

INSERT INTO payments (...)
VALUES (...)
ON CONFLICT DO NOTHING;`,
  },
  "idempotent-api": {
    title: "Idempotent API",
    mechanism: "Key + request hash + response replay",
    promise: "Tek execution, aynı response",
    explanation:
      "İlk istek key'in sahibi olur. Sonucu saklar. Aynı key ile gelen diğer istek provider'a gitmeden saklanan cevabı alır.",
    limitation:
      "Key saklama süresi, parametre uyuşmazlığı, owner crash'i ve provider sınırı ayrıca ele alınmalıdır.",
    interviewLine:
      "Aynı idempotency key ve aynı payload, aynı side effect ile aynı cevabı üretmelidir.",
    codeLanguage: "csharp",
    code: `var ownsKey = await TryClaimAsync(key, requestHash);

if (!ownsKey)
    return await ReplayStoredResponseAsync(key);

var charge = await provider.ChargeAsync(
    payment,
    idempotencyKey: key);

await StoreResponseAsync(key, charge);
return charge;`,
  },
};

export const interviewQuestions = [
  {
    question: "Idempotency tam olarak nedir?",
    answer:
      "Aynı business operation birden fazla kez istendiğinde yeni side effect üretmeden aynı sonucu döndürebilme özelliğidir. Sadece duplicate request'i reddetmek değildir.",
  },
  {
    question: "Unique constraint tek başına yeterli mi?",
    answer:
      "Tek bir veritabanındaki duplicate kaydı durdurur; fakat önceki response'u replay etmez, provider çağrısından sonraki crash'i çözmez ve servis sınırlarını tek başına korumaz.",
  },
  {
    question: "Provider timeout verdi; charge oluştu mu bilmiyorsun. Ne yaparsın?",
    answer:
      "Aynı provider idempotency key ile retry ederim. Provider bunu desteklemiyorsa status sorgusu ve reconciliation gerekir; körlemesine yeni charge açmam.",
  },
  {
    question: "Exactly-once processing var mı?",
    answer:
      "Uçtan uca dağıtık bir sistemde genel garanti olarak hayır. Pratik çözüm at-least-once delivery, durable state, idempotent consumer ve deduplication bileşimidir.",
  },
  {
    question: "Idempotency kaydında ne saklarsın?",
    answer:
      "Key, request hash, processing/completed durumu, response body veya sonucu yeniden kuracak referans, timestamps ve TTL. Aynı key farklı payload ile gelirse conflict dönerim.",
  },
];

export const sixtySecondAnswer =
  "Çift ödeme, aynı business operation'ın retry veya eşzamanlı isteklerle birden fazla kez çalışmasıdır. İlk savunma hattım payment intent üzerinde database unique constraint olur. API seviyesinde idempotency key'i request hash ile atomik olarak claim eder, yalnızca owner isteğin provider'ı çağırmasına izin veririm. Başarılı response'u saklayıp duplicate isteklere replay ederim ve aynı key'i provider sınırına da taşırım. Timeout ve crash durumları için processing state, retry ve reconciliation tasarlarım. Böylece exactly-once iddiası yerine at-least-once delivery altında effectively-once side effect üretirim.";

export function createStorySteps(result: LabRunResult): StoryStep[] {
  const charges = result.summary.providerCharges;
  const failed = charges > 1;

  const guardStep: StoryStep =
    result.mode === "unprotected"
      ? {
          label: "02 · Guard",
          title: "İki istek de içeri alındı",
          explanation:
            "API'nin aynı ödeme niyetini tanıyacağı bir key veya database kuralı yok.",
          focus: "api",
          tone: "danger",
        }
      : result.mode === "database-constraint"
        ? {
            label: "02 · Guard",
            title: "Unique index bir owner seçti",
            explanation:
              "İlk insert kazandı. İkinci insert aynı payment intent nedeniyle conflict aldı.",
            focus: "database",
            tone: "success",
          }
        : {
            label: "02 · Guard",
            title: "Idempotency key claim edildi",
            explanation:
              "Bir istek owner oldu; diğeri saklanacak cevabı beklemeye geçti.",
            focus: "database",
            tone: "success",
          };

  const providerStep: StoryStep =
    charges > 1
      ? {
          label: "03 · Side effect",
          title: "Provider iki charge oluşturdu",
          explanation:
            "İki ayrı HTTP çağrısı, müşterinin hesabında iki ayrı finansal etkiye dönüştü.",
          focus: "provider",
          tone: "danger",
        }
      : {
          label: "03 · Side effect",
          title: "Provider yalnızca bir kez çağrıldı",
          explanation:
            result.mode === "idempotent-api"
              ? "İkinci istek provider'a ulaşmadı; ilk isteğin cevabı replay edildi."
              : "Duplicate istek unique constraint tarafından provider çağrısından önce durduruldu.",
          focus: "provider",
          tone: "success",
        };

  return [
    {
      label: "01 · Race",
      title: "Tek sipariş, iki eşzamanlı istek",
      explanation:
        "İstek A ve İstek B aynı payment intent ve 499,90 TL tutarla aynı anda API'ye ulaştı.",
      focus: "customer",
      tone: "neutral",
    },
    guardStep,
    providerStep,
    {
      label: "04 · Sonuç",
      title: failed
        ? "Invariant bozuldu: bir intent, iki charge"
        : "Invariant korundu: bir intent, bir charge",
      explanation: failed
        ? "Teknik olarak iki başarılı request var; business açısından bu bir veri ve para hatası."
        : result.mode === "idempotent-api"
          ? "İki request aynı payment ve charge ID'sini gördü. İkinci response replay edildi."
          : "İkinci request duplicate olarak durduruldu; yeni finansal side effect oluşmadı.",
      focus: "result",
      tone: failed ? "danger" : "success",
    },
  ];
}
