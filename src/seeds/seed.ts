import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { User } from '../entities/user.entity';
import { UserRole, AuthProvider, ModelCategory, PlaygroundFieldType, PricingCategory, LogStatus, HttpMethod, TransactionType, TransactionStatus, InvoiceStatus } from '../enums';
import { Provider } from '../entities/provider.entity';
import { Model } from '../entities/model.entity';
import { ModelPricingTier } from '../entities/model-pricing-tier.entity';
import { ModelPlaygroundField } from '../entities/model-playground-field.entity';
import { ModelFieldOption } from '../entities/model-field-option.entity';
import { FeaturedSlide } from '../entities/featured-slide.entity';
import { FilterCategory } from '../entities/filter-category.entity';
import { FilterOption } from '../entities/filter-option.entity';
import { CreditPackage } from '../entities/credit-package.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { ApiUpdate } from '../entities/api-update.entity';
import { ApiUpdateTag } from '../entities/api-update-tag.entity';
import { ApiEndpoint } from '../entities/api-endpoint.entity';
import { ApiRequestParam } from '../entities/api-request-param.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { UserCredit } from '../entities/user-credit.entity';
import { ApiKey } from '../entities/api-key.entity';
import { Log } from '../entities/log.entity';
import { Transaction } from '../entities/transaction.entity';
import { Invoice } from '../entities/invoice.entity';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected. Cleaning...');

  // Truncate all tables before seeding
  const entities = AppDataSource.entityMetadatas;
  for (const entity of entities) {
    await AppDataSource.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
  console.log('All tables truncated. Seeding...');

  // ============================================================
  // 1. USERS
  // ============================================================
  const userRepo = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash('Password123', 10);

  const adminUser = userRepo.create({
    name: 'Admin User',
    email: 'admin@operis.market',
    initials: 'AU',
    passwordHash,
    authProvider: AuthProvider.LOCAL,
    emailVerified: true,
    role: UserRole.ADMIN,
  });

  const devUser = userRepo.create({
    name: 'Duc Developer',
    email: 'duc@operis.market',
    initials: 'DD',
    passwordHash,
    authProvider: AuthProvider.LOCAL,
    emailVerified: true,
    role: UserRole.DEVELOPER,
  });

  const viewerUser = userRepo.create({
    name: 'Viewer Test',
    email: 'viewer@operis.market',
    initials: 'VT',
    passwordHash,
    authProvider: AuthProvider.LOCAL,
    emailVerified: true,
    role: UserRole.VIEWER,
  });

  await userRepo.save([adminUser, devUser, viewerUser]);
  console.log('Users seeded (3)');

  // ============================================================
  // 2. USER SETTINGS
  // ============================================================
  const settingsRepo = AppDataSource.getRepository(UserSettings);
  await settingsRepo.save([
    settingsRepo.create({ userId: adminUser.id, theme: 'light' as any, emailNotifications: true }),
    settingsRepo.create({ userId: devUser.id, theme: 'dark' as any, emailNotifications: true }),
    settingsRepo.create({ userId: viewerUser.id, theme: 'light' as any, emailNotifications: false }),
  ]);
  console.log('User settings seeded (3)');

  // ============================================================
  // 3. USER CREDITS
  // ============================================================
  const creditRepo = AppDataSource.getRepository(UserCredit);
  await creditRepo.save([
    creditRepo.create({ userId: adminUser.id, balance: 50000 }),
    creditRepo.create({ userId: devUser.id, balance: 1500 }),
    creditRepo.create({ userId: viewerUser.id, balance: 100 }),
  ]);
  console.log('User credits seeded (3)');

  // ============================================================
  // 4. API KEYS
  // ============================================================
  const apiKeyRepo = AppDataSource.getRepository(ApiKey);
  const rawKey1 = 'ok-' + crypto.randomBytes(24).toString('hex');
  const rawKey2 = 'ok-' + crypto.randomBytes(24).toString('hex');
  await apiKeyRepo.save([
    apiKeyRepo.create({
      userId: devUser.id,
      name: 'Production Key',
      keyHash: crypto.createHash('sha256').update(rawKey1).digest('hex'),
      keyPrefix: rawKey1.slice(0, 8),
      lastUsedAt: new Date(),
      isRevoked: false,
    }),
    apiKeyRepo.create({
      userId: devUser.id,
      name: 'Development Key',
      keyHash: crypto.createHash('sha256').update(rawKey2).digest('hex'),
      keyPrefix: rawKey2.slice(0, 8),
      lastUsedAt: null,
      isRevoked: false,
    }),
  ]);
  console.log('API keys seeded (2)');

  // ============================================================
  // 5. PROVIDERS
  // ============================================================
  const providerRepo = AppDataSource.getRepository(Provider);
  const providers = await providerRepo.save([
    providerRepo.create({ name: 'OpenAI', sortOrder: 1 }),
    providerRepo.create({ name: 'Anthropic', sortOrder: 2 }),
    providerRepo.create({ name: 'Google', sortOrder: 3 }),
    providerRepo.create({ name: 'Meta', sortOrder: 4 }),
    providerRepo.create({ name: 'Stability AI', sortOrder: 5 }),
    providerRepo.create({ name: 'Runway', sortOrder: 6 }),
    providerRepo.create({ name: 'Suno', sortOrder: 7 }),
    providerRepo.create({ name: 'Midjourney', sortOrder: 8 }),
  ]);
  console.log('Providers seeded (8)');

  // ============================================================
  // 6. MODELS
  // ============================================================
  const modelRepo = AppDataSource.getRepository(Model);
  const models = await modelRepo.save([
    // -- Chat models --
    modelRepo.create({
      name: 'GPT-4o',
      slug: 'gpt-4o',
      provider: 'OpenAI',
      description: 'Most capable GPT model for complex tasks. Supports text, vision, and function calling with exceptional reasoning abilities.',
      category: ModelCategory.CHAT,
      tags: ['Chat', 'Vision', 'Function Calling'],
      taskTags: ['chat'],
      pricingDisplay: 'From 2 credits/1K tokens',
      gradient: 'from-green-500 to-emerald-600',
      isNew: false,
      isPopular: true,
    }),
    modelRepo.create({
      name: 'Claude 3.5 Sonnet',
      slug: 'claude-3-5-sonnet',
      provider: 'Anthropic',
      description: 'Advanced AI assistant with nuanced understanding, strong coding abilities, and careful reasoning. Excels at analysis and creative tasks.',
      category: ModelCategory.CHAT,
      tags: ['Chat', 'Analysis', 'Code'],
      taskTags: ['chat'],
      pricingDisplay: 'From 3 credits/1K tokens',
      gradient: 'from-orange-500 to-amber-600',
      isNew: true,
      isPopular: true,
    }),
    modelRepo.create({
      name: 'Gemini 2.0 Flash',
      slug: 'gemini-2-flash',
      provider: 'Google',
      description: 'Google\'s fastest multimodal model with support for text, images, audio, and video understanding.',
      category: ModelCategory.CHAT,
      tags: ['Chat', 'Multimodal', 'Fast'],
      taskTags: ['chat'],
      pricingDisplay: 'From 1 credit/1K tokens',
      gradient: 'from-blue-500 to-indigo-600',
      isNew: true,
      isPopular: false,
    }),
    modelRepo.create({
      name: 'Llama 3.1 405B',
      slug: 'llama-3-1-405b',
      provider: 'Meta',
      description: 'Meta\'s largest open-source model with state-of-the-art performance on reasoning, coding, and multilingual tasks.',
      category: ModelCategory.CHAT,
      tags: ['Chat', 'Open Source', 'Large'],
      taskTags: ['chat'],
      pricingDisplay: 'From 2 credits/1K tokens',
      gradient: 'from-purple-500 to-violet-600',
      isNew: false,
      isPopular: true,
    }),

    // -- Image models --
    modelRepo.create({
      name: 'DALL-E 3',
      slug: 'dall-e-3',
      provider: 'OpenAI',
      description: 'Create realistic images and art from natural language descriptions. Supports various styles, sizes, and artistic directions.',
      category: ModelCategory.IMAGE,
      tags: ['Image', 'Generation', 'Art'],
      taskTags: ['text-to-image'],
      pricingDisplay: '8 credits/image',
      gradient: 'from-pink-500 to-rose-600',
      isNew: false,
      isPopular: true,
    }),
    modelRepo.create({
      name: 'Stable Diffusion XL',
      slug: 'stable-diffusion-xl',
      provider: 'Stability AI',
      description: 'High-quality image generation with fine control over artistic style, composition, and details. Supports img2img and inpainting.',
      category: ModelCategory.IMAGE,
      tags: ['Image', 'Open Source', 'Customizable'],
      taskTags: ['text-to-image', 'image-to-image', 'image-editing'],
      pricingDisplay: '4 credits/image',
      gradient: 'from-cyan-500 to-teal-600',
      isNew: false,
      isPopular: true,
    }),
    modelRepo.create({
      name: 'Midjourney v6',
      slug: 'midjourney-v6',
      provider: 'Midjourney',
      description: 'Industry-leading image generation with photorealistic output and exceptional artistic quality.',
      category: ModelCategory.IMAGE,
      tags: ['Image', 'Photorealistic', 'Premium'],
      taskTags: ['text-to-image'],
      pricingDisplay: '12 credits/image',
      gradient: 'from-indigo-500 to-blue-600',
      isNew: true,
      isPopular: true,
    }),

    // -- Video models --
    modelRepo.create({
      name: 'Runway Gen-3 Alpha',
      slug: 'runway-gen3-alpha',
      provider: 'Runway',
      description: 'Next-generation video model capable of creating high-fidelity videos from text and image prompts with cinematic quality.',
      category: ModelCategory.VIDEO,
      tags: ['Video', 'Generation', 'Cinematic'],
      taskTags: ['text-to-video'],
      pricingDisplay: '50 credits/5s clip',
      gradient: 'from-red-500 to-orange-600',
      isNew: true,
      isPopular: true,
    }),
    modelRepo.create({
      name: 'Sora',
      slug: 'sora',
      provider: 'OpenAI',
      description: 'OpenAI\'s text-to-video model creating realistic and imaginative scenes from text instructions up to 60 seconds.',
      category: ModelCategory.VIDEO,
      tags: ['Video', 'Text-to-Video', 'Premium'],
      taskTags: ['text-to-video'],
      pricingDisplay: '100 credits/10s clip',
      gradient: 'from-violet-500 to-purple-600',
      isNew: true,
      isPopular: true,
    }),

    // -- Music models --
    modelRepo.create({
      name: 'Suno v3.5',
      slug: 'suno-v3-5',
      provider: 'Suno',
      description: 'AI music generation from text prompts. Create full songs with vocals, instruments, and lyrics in any genre.',
      category: ModelCategory.MUSIC,
      tags: ['Music', 'Audio', 'Generation'],
      taskTags: ['text-to-music'],
      pricingDisplay: '20 credits/song',
      gradient: 'from-yellow-500 to-orange-600',
      isNew: false,
      isPopular: true,
    }),
  ]);
  console.log('Models seeded (10)');

  // ============================================================
  // 7. MODEL PRICING TIERS
  // ============================================================
  const tierRepo = AppDataSource.getRepository(ModelPricingTier);
  const gpt4o = models[0];
  const claude = models[1];
  const gemini = models[2];
  const llama = models[3];
  const dalle = models[4];
  const sdxl = models[5];
  const mj = models[6];
  const runway = models[7];
  const sora = models[8];
  const suno = models[9];

  await tierRepo.save([
    // GPT-4o tiers
    tierRepo.create({ modelId: gpt4o.id, name: 'GPT-4o Input', category: PricingCategory.CHAT, provider: 'OpenAI', credits: 1000, creditUnit: '1K tokens', ourPrice: 2.0, marketPrice: 2.5 }),
    tierRepo.create({ modelId: gpt4o.id, name: 'GPT-4o Output', category: PricingCategory.CHAT, provider: 'OpenAI', credits: 1000, creditUnit: '1K tokens', ourPrice: 6.0, marketPrice: 7.5 }),
    // Claude tiers
    tierRepo.create({ modelId: claude.id, name: 'Claude Sonnet Input', category: PricingCategory.CHAT, provider: 'Anthropic', credits: 1000, creditUnit: '1K tokens', ourPrice: 3.0, marketPrice: 3.0 }),
    tierRepo.create({ modelId: claude.id, name: 'Claude Sonnet Output', category: PricingCategory.CHAT, provider: 'Anthropic', credits: 1000, creditUnit: '1K tokens', ourPrice: 15.0, marketPrice: 15.0 }),
    // Gemini tiers
    tierRepo.create({ modelId: gemini.id, name: 'Gemini Flash Input', category: PricingCategory.CHAT, provider: 'Google', credits: 1000, creditUnit: '1K tokens', ourPrice: 0.075, marketPrice: 0.1 }),
    tierRepo.create({ modelId: gemini.id, name: 'Gemini Flash Output', category: PricingCategory.CHAT, provider: 'Google', credits: 1000, creditUnit: '1K tokens', ourPrice: 0.3, marketPrice: 0.4 }),
    // Llama tiers
    tierRepo.create({ modelId: llama.id, name: 'Llama 405B Input', category: PricingCategory.CHAT, provider: 'Meta', credits: 1000, creditUnit: '1K tokens', ourPrice: 2.0, marketPrice: 3.0 }),
    tierRepo.create({ modelId: llama.id, name: 'Llama 405B Output', category: PricingCategory.CHAT, provider: 'Meta', credits: 1000, creditUnit: '1K tokens', ourPrice: 6.0, marketPrice: 8.0 }),
    // DALL-E 3
    tierRepo.create({ modelId: dalle.id, name: 'DALL-E 3 Standard', category: PricingCategory.IMAGE, provider: 'OpenAI', credits: 1, creditUnit: 'image', ourPrice: 8.0, marketPrice: 10.0 }),
    tierRepo.create({ modelId: dalle.id, name: 'DALL-E 3 HD', category: PricingCategory.IMAGE, provider: 'OpenAI', credits: 1, creditUnit: 'image', ourPrice: 12.0, marketPrice: 15.0 }),
    // SDXL
    tierRepo.create({ modelId: sdxl.id, name: 'SDXL Standard', category: PricingCategory.IMAGE, provider: 'Stability AI', credits: 1, creditUnit: 'image', ourPrice: 4.0, marketPrice: 6.0 }),
    // Midjourney
    tierRepo.create({ modelId: mj.id, name: 'Midjourney v6', category: PricingCategory.IMAGE, provider: 'Midjourney', credits: 1, creditUnit: 'image', ourPrice: 12.0, marketPrice: 15.0 }),
    // Runway
    tierRepo.create({ modelId: runway.id, name: 'Runway Gen-3 5s', category: PricingCategory.VIDEO, provider: 'Runway', credits: 1, creditUnit: '5s clip', ourPrice: 50.0, marketPrice: 65.0 }),
    // Sora
    tierRepo.create({ modelId: sora.id, name: 'Sora 10s', category: PricingCategory.VIDEO, provider: 'OpenAI', credits: 1, creditUnit: '10s clip', ourPrice: 100.0, marketPrice: 120.0 }),
    // Suno
    tierRepo.create({ modelId: suno.id, name: 'Suno Song', category: PricingCategory.MUSIC, provider: 'Suno', credits: 1, creditUnit: 'song', ourPrice: 20.0, marketPrice: 25.0 }),
  ]);
  console.log('Pricing tiers seeded (15)');

  // ============================================================
  // 8. PLAYGROUND FIELDS
  // ============================================================
  const fieldRepo = AppDataSource.getRepository(ModelPlaygroundField);
  const optionRepo = AppDataSource.getRepository(ModelFieldOption);

  // Common chat fields (category-level)
  const promptField = fieldRepo.create({
    category: ModelCategory.CHAT, modelSlug: null,
    name: 'prompt', label: 'Prompt', type: PlaygroundFieldType.TEXTAREA,
    description: 'Enter your message', required: true, placeholder: 'Type your message here...', sortOrder: 1,
  });
  const tempField = fieldRepo.create({
    category: ModelCategory.CHAT, modelSlug: null,
    name: 'temperature', label: 'Temperature', type: PlaygroundFieldType.NUMBER,
    description: 'Controls randomness (0-2)', required: false, defaultValue: '0.7', sortOrder: 2,
  });
  const maxTokensField = fieldRepo.create({
    category: ModelCategory.CHAT, modelSlug: null,
    name: 'max_tokens', label: 'Max Tokens', type: PlaygroundFieldType.NUMBER,
    description: 'Maximum tokens to generate', required: false, defaultValue: '2048', sortOrder: 3,
  });
  const streamField = fieldRepo.create({
    category: ModelCategory.CHAT, modelSlug: null,
    name: 'stream', label: 'Stream', type: PlaygroundFieldType.TOGGLE,
    description: 'Enable streaming response', required: false, defaultValue: 'true', sortOrder: 4,
  });

  // Image fields
  const imgPromptField = fieldRepo.create({
    category: ModelCategory.IMAGE, modelSlug: null,
    name: 'prompt', label: 'Prompt', type: PlaygroundFieldType.TEXTAREA,
    description: 'Describe the image', required: true, placeholder: 'A sunset over mountains...', sortOrder: 1,
  });
  const imgSizeField = fieldRepo.create({
    category: ModelCategory.IMAGE, modelSlug: null,
    name: 'size', label: 'Size', type: PlaygroundFieldType.SELECT,
    description: 'Image dimensions', required: true, defaultValue: '1024x1024', sortOrder: 2,
  });
  const imgStyleField = fieldRepo.create({
    category: ModelCategory.IMAGE, modelSlug: null,
    name: 'style', label: 'Style', type: PlaygroundFieldType.SELECT,
    description: 'Art style', required: false, defaultValue: 'natural', sortOrder: 3,
  });

  // Video fields
  const vidPromptField = fieldRepo.create({
    category: ModelCategory.VIDEO, modelSlug: null,
    name: 'prompt', label: 'Prompt', type: PlaygroundFieldType.TEXTAREA,
    description: 'Describe the video', required: true, placeholder: 'A drone flying over a city...', sortOrder: 1,
  });
  const vidDurationField = fieldRepo.create({
    category: ModelCategory.VIDEO, modelSlug: null,
    name: 'duration', label: 'Duration', type: PlaygroundFieldType.SELECT,
    description: 'Video length', required: true, defaultValue: '5', sortOrder: 2,
  });
  const vidRefImage = fieldRepo.create({
    category: ModelCategory.VIDEO, modelSlug: null,
    name: 'reference_image', label: 'Reference Image', type: PlaygroundFieldType.FILE,
    description: 'Optional reference image for img-to-video', required: false, sortOrder: 3,
  });

  // Music fields
  const musicPromptField = fieldRepo.create({
    category: ModelCategory.MUSIC, modelSlug: null,
    name: 'prompt', label: 'Prompt', type: PlaygroundFieldType.TEXTAREA,
    description: 'Describe the music', required: true, placeholder: 'An upbeat pop song about summer...', sortOrder: 1,
  });
  const musicGenreField = fieldRepo.create({
    category: ModelCategory.MUSIC, modelSlug: null,
    name: 'genre', label: 'Genre', type: PlaygroundFieldType.SELECT,
    description: 'Music genre', required: false, defaultValue: 'pop', sortOrder: 2,
  });
  const musicInstrumental = fieldRepo.create({
    category: ModelCategory.MUSIC, modelSlug: null,
    name: 'instrumental', label: 'Instrumental Only', type: PlaygroundFieldType.TOGGLE,
    description: 'Remove vocals', required: false, defaultValue: 'false', sortOrder: 3,
  });

  const savedFields = await fieldRepo.save([
    promptField, tempField, maxTokensField, streamField,
    imgPromptField, imgSizeField, imgStyleField,
    vidPromptField, vidDurationField, vidRefImage,
    musicPromptField, musicGenreField, musicInstrumental,
  ]);
  console.log('Playground fields seeded (13)');

  // Field options for select fields
  await optionRepo.save([
    // Image size options
    optionRepo.create({ fieldId: imgSizeField.id, label: '256x256', value: '256x256', sortOrder: 1 }),
    optionRepo.create({ fieldId: imgSizeField.id, label: '512x512', value: '512x512', sortOrder: 2 }),
    optionRepo.create({ fieldId: imgSizeField.id, label: '1024x1024', value: '1024x1024', sortOrder: 3 }),
    optionRepo.create({ fieldId: imgSizeField.id, label: '1024x1792', value: '1024x1792', sortOrder: 4 }),
    optionRepo.create({ fieldId: imgSizeField.id, label: '1792x1024', value: '1792x1024', sortOrder: 5 }),
    // Image style options
    optionRepo.create({ fieldId: imgStyleField.id, label: 'Natural', value: 'natural', sortOrder: 1 }),
    optionRepo.create({ fieldId: imgStyleField.id, label: 'Vivid', value: 'vivid', sortOrder: 2 }),
    optionRepo.create({ fieldId: imgStyleField.id, label: 'Anime', value: 'anime', sortOrder: 3 }),
    optionRepo.create({ fieldId: imgStyleField.id, label: 'Photorealistic', value: 'photorealistic', sortOrder: 4 }),
    // Video duration options
    optionRepo.create({ fieldId: vidDurationField.id, label: '4 seconds', value: '4', sortOrder: 1 }),
    optionRepo.create({ fieldId: vidDurationField.id, label: '5 seconds', value: '5', sortOrder: 2 }),
    optionRepo.create({ fieldId: vidDurationField.id, label: '10 seconds', value: '10', sortOrder: 3 }),
    optionRepo.create({ fieldId: vidDurationField.id, label: '15 seconds', value: '15', sortOrder: 4 }),
    // Music genre options
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Pop', value: 'pop', sortOrder: 1 }),
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Rock', value: 'rock', sortOrder: 2 }),
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Hip Hop', value: 'hiphop', sortOrder: 3 }),
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Electronic', value: 'electronic', sortOrder: 4 }),
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Jazz', value: 'jazz', sortOrder: 5 }),
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Classical', value: 'classical', sortOrder: 6 }),
    optionRepo.create({ fieldId: musicGenreField.id, label: 'Lo-Fi', value: 'lofi', sortOrder: 7 }),
  ]);
  console.log('Field options seeded (20)');

  // ============================================================
  // 9. FEATURED SLIDES
  // ============================================================
  const slideRepo = AppDataSource.getRepository(FeaturedSlide);
  await slideRepo.save([
    slideRepo.create({
      modelName: 'GPT-4o', description: 'The most capable AI model for complex reasoning, coding, and creative tasks.',
      tags: ['Chat', 'Vision', 'Code'], href: '/models/gpt-4o', gradient: 'from-green-500 to-emerald-600', sortOrder: 1,
    }),
    slideRepo.create({
      modelName: 'Sora', description: 'Create stunning videos from text. The future of AI video generation is here.',
      tags: ['Video', 'Text-to-Video', 'Premium'], href: '/models/sora', gradient: 'from-violet-500 to-purple-600', sortOrder: 2,
    }),
    slideRepo.create({
      modelName: 'Claude 3.5 Sonnet', description: 'Advanced reasoning with exceptional coding and analysis capabilities.',
      tags: ['Chat', 'Analysis', 'Code'], href: '/models/claude-3-5-sonnet', gradient: 'from-orange-500 to-amber-600', sortOrder: 3,
    }),
    slideRepo.create({
      modelName: 'Midjourney v6', description: 'Industry-leading photorealistic image generation with unmatched quality.',
      tags: ['Image', 'Photorealistic', 'Premium'], href: '/models/midjourney-v6', gradient: 'from-indigo-500 to-blue-600', sortOrder: 4,
    }),
    slideRepo.create({
      modelName: 'Suno v3.5', description: 'Create full songs with AI — vocals, instruments, and lyrics in any genre.',
      tags: ['Music', 'Audio', 'Generation'], href: '/models/suno-v3-5', gradient: 'from-yellow-500 to-orange-600', sortOrder: 5,
    }),
  ]);
  console.log('Featured slides seeded (5)');

  // ============================================================
  // 10. FILTER CATEGORIES & OPTIONS
  // ============================================================
  const filterCatRepo = AppDataSource.getRepository(FilterCategory);
  const filterOptRepo = AppDataSource.getRepository(FilterOption);

  const catVideo = filterCatRepo.create({ label: 'Video Generation', sortOrder: 1 });
  const catImage = filterCatRepo.create({ label: 'Image Generation', sortOrder: 2 });
  const catMusic = filterCatRepo.create({ label: 'Music Generation', sortOrder: 3 });
  const catChat = filterCatRepo.create({ label: 'Chat', sortOrder: 4 });
  await filterCatRepo.save([catVideo, catImage, catMusic, catChat]);

  await filterOptRepo.save([
    // Video Generation options
    filterOptRepo.create({ categoryId: catVideo.id, label: 'Text to Video', sortOrder: 1 }),
    filterOptRepo.create({ categoryId: catVideo.id, label: 'Image to Video', sortOrder: 2 }),
    filterOptRepo.create({ categoryId: catVideo.id, label: 'Video to Video', sortOrder: 3 }),
    filterOptRepo.create({ categoryId: catVideo.id, label: 'Video Editing', sortOrder: 4 }),
    filterOptRepo.create({ categoryId: catVideo.id, label: 'Speech to Video', sortOrder: 5 }),
    filterOptRepo.create({ categoryId: catVideo.id, label: 'Lip Sync', sortOrder: 6 }),
    // Image Generation options
    filterOptRepo.create({ categoryId: catImage.id, label: 'Text to Image', sortOrder: 1 }),
    filterOptRepo.create({ categoryId: catImage.id, label: 'Image to Image', sortOrder: 2 }),
    filterOptRepo.create({ categoryId: catImage.id, label: 'Image Editing', sortOrder: 3 }),
    // Music Generation options
    filterOptRepo.create({ categoryId: catMusic.id, label: 'Text to Music', sortOrder: 1 }),
    filterOptRepo.create({ categoryId: catMusic.id, label: 'Speech to Text', sortOrder: 2 }),
    filterOptRepo.create({ categoryId: catMusic.id, label: 'Text to Speech', sortOrder: 3 }),
    filterOptRepo.create({ categoryId: catMusic.id, label: 'Audio to Audio', sortOrder: 4 }),
    // Chat options
    filterOptRepo.create({ categoryId: catChat.id, label: 'Chat', sortOrder: 1 }),
  ]);
  console.log('Filters seeded (4 categories, 14 options)');

  // ============================================================
  // 11. CREDIT PACKAGES
  // ============================================================
  const pkgRepo = AppDataSource.getRepository(CreditPackage);
  await pkgRepo.save([
    pkgRepo.create({ price: 5.00, credits: 500, badge: null }),
    pkgRepo.create({ price: 10.00, credits: 1100, badge: 'Popular' }),
    pkgRepo.create({ price: 25.00, credits: 3000, badge: 'Best Value' }),
    pkgRepo.create({ price: 50.00, credits: 6500, badge: null }),
    pkgRepo.create({ price: 100.00, credits: 14000, badge: 'Enterprise' }),
  ]);
  console.log('Credit packages seeded (5)');

  // ============================================================
  // 12. SUBSCRIPTION PLANS
  // ============================================================
  const planRepo = AppDataSource.getRepository(SubscriptionPlan);
  await planRepo.save([
    planRepo.create({
      name: 'Free', slug: 'free', description: 'Get started with basic AI capabilities',
      monthlyPrice: 0, yearlyPrice: 0, monthlyCredits: 100,
      features: ['100 credits/month', 'Chat models only', 'Community support', '5 API keys'],
      isPopular: false, sortOrder: 1,
    }),
    planRepo.create({
      name: 'Starter', slug: 'starter', description: 'For individual developers and small projects',
      monthlyPrice: 19.99, yearlyPrice: 199.99, monthlyCredits: 2000,
      features: ['2,000 credits/month', 'All model categories', 'Email support', '10 API keys', 'Basic analytics'],
      isPopular: false, sortOrder: 2,
    }),
    planRepo.create({
      name: 'Pro', slug: 'pro', description: 'For professional developers and growing teams',
      monthlyPrice: 49.99, yearlyPrice: 499.99, monthlyCredits: 8000,
      features: ['8,000 credits/month', 'All models + priority access', 'Priority support', '25 API keys', 'Advanced analytics', 'Team management (3 seats)'],
      isPopular: true, sortOrder: 3,
    }),
    planRepo.create({
      name: 'Enterprise', slug: 'enterprise', description: 'For large teams and organizations',
      monthlyPrice: 199.99, yearlyPrice: 1999.99, monthlyCredits: 50000,
      features: ['50,000 credits/month', 'All models + early access', 'Dedicated support', 'Unlimited API keys', 'Custom analytics', 'Unlimited team seats', 'SLA guarantee', 'Custom integrations'],
      isPopular: false, sortOrder: 4,
    }),
  ]);
  console.log('Subscription plans seeded (4)');

  // ============================================================
  // 13. API UPDATE TAGS
  // ============================================================
  const tagRepo = AppDataSource.getRepository(ApiUpdateTag);
  const tags = await tagRepo.save([
    tagRepo.create({ name: 'New Feature' }),
    tagRepo.create({ name: 'Improvement' }),
    tagRepo.create({ name: 'Bug Fix' }),
    tagRepo.create({ name: 'Breaking Change' }),
    tagRepo.create({ name: 'Deprecation' }),
    tagRepo.create({ name: 'Security' }),
  ]);
  console.log('Update tags seeded (6)');

  // ============================================================
  // 14. API UPDATES
  // ============================================================
  const updateRepo = AppDataSource.getRepository(ApiUpdate);
  await updateRepo.save([
    updateRepo.create({
      date: '2026-03-06', tag: 'New Feature', title: 'Sora Video Generation API',
      content: 'Added support for OpenAI Sora text-to-video generation. Create stunning 10-second video clips from text prompts. Available on Pro and Enterprise plans.',
    }),
    updateRepo.create({
      date: '2026-03-01', tag: 'Improvement', title: 'Claude 3.5 Sonnet Integration',
      content: 'Upgraded to Claude 3.5 Sonnet with improved reasoning, coding, and analysis capabilities. 2x faster response times compared to previous version.',
    }),
    updateRepo.create({
      date: '2026-02-25', tag: 'New Feature', title: 'Music Generation with Suno v3.5',
      content: 'Introducing AI music generation powered by Suno v3.5. Create full songs with vocals, instruments, and lyrics in any genre. Supports multiple genres and instrumental-only mode.',
    }),
    updateRepo.create({
      date: '2026-02-20', tag: 'Improvement', title: 'Rate Limiting Improvements',
      content: 'Enhanced rate limiting with per-API-key granularity. Enterprise users now get 120 requests/minute. Added detailed rate limit headers in responses.',
    }),
    updateRepo.create({
      date: '2026-02-15', tag: 'Bug Fix', title: 'Fixed Webhook Signature Verification',
      content: 'Resolved an issue where SePay webhook signatures were incorrectly validated when the payload contained Unicode characters. All payment webhooks now process correctly.',
    }),
    updateRepo.create({
      date: '2026-02-10', tag: 'New Feature', title: 'Team Management',
      content: 'Added team management features. Invite team members, assign roles, and manage API key access across your organization.',
    }),
    updateRepo.create({
      date: '2026-02-01', tag: 'Security', title: 'Security Update: Token Rotation',
      content: 'Implemented JWT token family rotation for enhanced security. Refresh tokens are now single-use with automatic family revocation on reuse detection.',
    }),
    updateRepo.create({
      date: '2026-01-25', tag: 'Breaking Change', title: 'API v2 Migration',
      content: 'API v2 is now the default. v1 endpoints deprecated and will be removed on April 1, 2026. Key changes: pagination format, error response structure, authentication headers.',
    }),
  ]);
  console.log('API updates seeded (8)');

  // ============================================================
  // 15. API ENDPOINTS & PARAMS
  // ============================================================
  const endpointRepo = AppDataSource.getRepository(ApiEndpoint);
  const paramRepo = AppDataSource.getRepository(ApiRequestParam);

  const chatEndpoint = endpointRepo.create({
    method: HttpMethod.POST, name: 'Chat Completion', path: '/v1/chat/completions',
    description: 'Generate a chat completion response from the specified model',
  });
  const imgEndpoint = endpointRepo.create({
    method: HttpMethod.POST, name: 'Image Generation', path: '/v1/images/generations',
    description: 'Create an image given a text prompt',
  });
  const vidEndpoint = endpointRepo.create({
    method: HttpMethod.POST, name: 'Video Generation', path: '/v1/videos/generations',
    description: 'Create a video clip from a text or image prompt',
  });
  const musicEndpoint = endpointRepo.create({
    method: HttpMethod.POST, name: 'Music Generation', path: '/v1/music/generations',
    description: 'Generate a music track from a text description',
  });
  const modelsEndpoint = endpointRepo.create({
    method: HttpMethod.GET, name: 'List Models', path: '/v1/models',
    description: 'List available AI models with pricing and capabilities',
  });
  const balanceEndpoint = endpointRepo.create({
    method: HttpMethod.GET, name: 'Check Balance', path: '/v1/balance',
    description: 'Get current credit balance for authenticated user',
  });

  await endpointRepo.save([chatEndpoint, imgEndpoint, vidEndpoint, musicEndpoint, modelsEndpoint, balanceEndpoint]);

  await paramRepo.save([
    // Chat params
    paramRepo.create({ endpointId: chatEndpoint.id, name: 'model', type: 'string', required: true, description: 'Model slug (e.g., gpt-4o, claude-3-5-sonnet)' }),
    paramRepo.create({ endpointId: chatEndpoint.id, name: 'messages', type: 'array', required: true, description: 'Array of message objects with role and content' }),
    paramRepo.create({ endpointId: chatEndpoint.id, name: 'temperature', type: 'number', required: false, description: 'Sampling temperature (0-2), default 0.7' }),
    paramRepo.create({ endpointId: chatEndpoint.id, name: 'max_tokens', type: 'integer', required: false, description: 'Maximum tokens to generate, default 2048' }),
    paramRepo.create({ endpointId: chatEndpoint.id, name: 'stream', type: 'boolean', required: false, description: 'Enable streaming response, default false' }),
    // Image params
    paramRepo.create({ endpointId: imgEndpoint.id, name: 'model', type: 'string', required: true, description: 'Model slug (e.g., dall-e-3, stable-diffusion-xl)' }),
    paramRepo.create({ endpointId: imgEndpoint.id, name: 'prompt', type: 'string', required: true, description: 'Text description of the desired image' }),
    paramRepo.create({ endpointId: imgEndpoint.id, name: 'size', type: 'string', required: false, description: 'Image size (256x256, 512x512, 1024x1024), default 1024x1024' }),
    paramRepo.create({ endpointId: imgEndpoint.id, name: 'style', type: 'string', required: false, description: 'Style (natural, vivid, anime, photorealistic)' }),
    paramRepo.create({ endpointId: imgEndpoint.id, name: 'n', type: 'integer', required: false, description: 'Number of images (1-4), default 1' }),
    // Video params
    paramRepo.create({ endpointId: vidEndpoint.id, name: 'model', type: 'string', required: true, description: 'Model slug (e.g., runway-gen3-alpha, sora)' }),
    paramRepo.create({ endpointId: vidEndpoint.id, name: 'prompt', type: 'string', required: true, description: 'Text description of the desired video' }),
    paramRepo.create({ endpointId: vidEndpoint.id, name: 'duration', type: 'integer', required: false, description: 'Video duration in seconds (4, 5, 10, 15)' }),
    paramRepo.create({ endpointId: vidEndpoint.id, name: 'reference_image', type: 'string', required: false, description: 'Base64 or URL of reference image for img-to-video' }),
    // Music params
    paramRepo.create({ endpointId: musicEndpoint.id, name: 'model', type: 'string', required: true, description: 'Model slug (e.g., suno-v3-5)' }),
    paramRepo.create({ endpointId: musicEndpoint.id, name: 'prompt', type: 'string', required: true, description: 'Text description of the desired music' }),
    paramRepo.create({ endpointId: musicEndpoint.id, name: 'genre', type: 'string', required: false, description: 'Music genre (pop, rock, hiphop, electronic, jazz, classical, lofi)' }),
    paramRepo.create({ endpointId: musicEndpoint.id, name: 'instrumental', type: 'boolean', required: false, description: 'Instrumental only (no vocals), default false' }),
    // Models list params
    paramRepo.create({ endpointId: modelsEndpoint.id, name: 'category', type: 'string', required: false, description: 'Filter by category (chat, image, video, music)' }),
    paramRepo.create({ endpointId: modelsEndpoint.id, name: 'provider', type: 'string', required: false, description: 'Filter by provider name' }),
  ]);
  console.log('API endpoints seeded (6) with params (20)');

  // ============================================================
  // 16. TRANSACTIONS (sample for devUser)
  // ============================================================
  const txRepo = AppDataSource.getRepository(Transaction);
  const tx1 = txRepo.create({
    userId: devUser.id, credits: 1100, amount: 10.00,
    type: TransactionType.CREDIT_PURCHASE, status: TransactionStatus.COMPLETED,
    description: 'Purchased 1,100 credits',
  });
  const tx2 = txRepo.create({
    userId: devUser.id, credits: 500, amount: 5.00,
    type: TransactionType.SEPAY_TOPUP, status: TransactionStatus.COMPLETED,
    sepayRef: 'SEPAY-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
    description: 'SePay top-up 500 credits',
  });
  const tx3 = txRepo.create({
    userId: adminUser.id, credits: 14000, amount: 100.00,
    type: TransactionType.CREDIT_PURCHASE, status: TransactionStatus.COMPLETED,
    description: 'Purchased 14,000 credits (Enterprise)',
  });
  await txRepo.save([tx1, tx2, tx3]);
  console.log('Transactions seeded (3)');

  // ============================================================
  // 17. INVOICES
  // ============================================================
  const invRepo = AppDataSource.getRepository(Invoice);
  await invRepo.save([
    invRepo.create({
      invoiceNumber: 'INV-2026-0001', userId: devUser.id, transactionId: tx1.id,
      status: InvoiceStatus.PAID, subtotal: 10.00, tax: 0, total: 10.00,
      currency: 'USD', issuedAt: new Date('2026-02-15'), paidAt: new Date('2026-02-15'),
      items: [{ description: '1,100 Credits Package', quantity: 1, unitPrice: 10.00, amount: 10.00 }],
    }),
    invRepo.create({
      invoiceNumber: 'INV-2026-0002', userId: devUser.id, transactionId: tx2.id,
      status: InvoiceStatus.PAID, subtotal: 5.00, tax: 0, total: 5.00,
      currency: 'USD', issuedAt: new Date('2026-03-01'), paidAt: new Date('2026-03-01'),
      items: [{ description: 'SePay Top-up 500 Credits', quantity: 1, unitPrice: 5.00, amount: 5.00 }],
    }),
    invRepo.create({
      invoiceNumber: 'INV-2026-0003', userId: adminUser.id, transactionId: tx3.id,
      status: InvoiceStatus.PAID, subtotal: 100.00, tax: 0, total: 100.00,
      currency: 'USD', issuedAt: new Date('2026-03-05'), paidAt: new Date('2026-03-05'),
      items: [{ description: '14,000 Credits Enterprise Package', quantity: 1, unitPrice: 100.00, amount: 100.00 }],
    }),
  ]);
  console.log('Invoices seeded (3)');

  // ============================================================
  // 18. LOGS (sample API call logs for devUser)
  // ============================================================
  const logRepo = AppDataSource.getRepository(Log);
  const logEntries = [];
  const modelSlugs = ['gpt-4o', 'claude-3-5-sonnet', 'dall-e-3', 'gemini-2-flash', 'suno-v3-5'];
  const statuses = [LogStatus.SUCCESS, LogStatus.SUCCESS, LogStatus.SUCCESS, LogStatus.FAILED, LogStatus.SUCCESS];

  for (let i = 0; i < 20; i++) {
    const dayOffset = Math.floor(i / 4);
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const hours = String(8 + (i % 12)).padStart(2, '0');
    const mins = String((i * 7) % 60).padStart(2, '0');
    const modelSlug = modelSlugs[i % modelSlugs.length];
    const status = statuses[i % statuses.length];

    logEntries.push(logRepo.create({
      userId: devUser.id,
      model: modelSlug,
      date: dateStr,
      time: `${hours}:${mins}:00`,
      duration: 200 + Math.floor(Math.random() * 3000),
      input: `Sample ${modelSlug} request #${i + 1}`,
      status,
      creditsConsumed: status === LogStatus.FAILED ? 0 : (modelSlug.includes('dall') ? 8 : modelSlug.includes('suno') ? 20 : 2 + Math.floor(Math.random() * 5)),
      taskId: `task-${crypto.randomBytes(4).toString('hex')}`,
      hasResult: status === LogStatus.SUCCESS,
    }));
  }
  await logRepo.save(logEntries);
  console.log('Logs seeded (20)');

  // ============================================================
  console.log('\nSeed completed successfully!');
  console.log('Login credentials: email=duc@operis.market password=Password123');
  console.log('Admin credentials: email=admin@operis.market password=Password123');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
