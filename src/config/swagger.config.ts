import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Operis Market API',
      version: '1.0.0',
      description: 'AI Model Marketplace — Backend API Documentation',
      contact: {
        name: 'Operis Market',
        email: 'support@operis.market',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication & Authorization' },
      { name: 'Models', description: 'AI Models & Marketplace' },
      { name: 'Filters', description: 'Filter categories & providers' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Auth - OAuth', description: 'OAuth login (Google, GitHub)' },
      { name: 'Billing', description: 'Credits, transactions & SePay payments' },
      { name: 'Subscriptions', description: 'Subscription plans & management' },
      { name: 'Invoices', description: 'Invoice management' },
      { name: 'Logs', description: 'API call logs & usage stats' },
      { name: 'Settings', description: 'User settings & profile' },
      { name: 'Updates', description: 'API updates & changelog' },
      { name: 'Chat', description: 'AI chat completions via API key' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT access token stored in httpOnly cookie. Login first to set cookie.',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key as Bearer token. Use the key returned from POST /api-keys.',
        },
      },
      schemas: {
        // -- Common --
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 55 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'array', items: {} },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },

        // -- Auth --
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Huy Nguyen', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email', example: 'huy@example.com' },
            password: { type: 'string', format: 'password', minLength: 8, maxLength: 128, example: 'SecurePass123!' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'huy@example.com' },
            password: { type: 'string', format: 'password', example: 'SecurePass123!' },
          },
        },
        VerifyEmailRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', example: 'a1b2c3d4e5f6...' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Huy Nguyen' },
            email: { type: 'string', format: 'email' },
            initials: { type: 'string', example: 'HN' },
            avatarUrl: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['admin', 'developer', 'viewer'] },
          },
        },

        // -- Models --
        Model: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Google Veo 3.1' },
            slug: { type: 'string', example: 'veo-3-1' },
            provider: { type: 'string', example: 'Google DeepMind' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['video', 'image', 'music', 'chat'] },
            tags: { type: 'array', items: { type: 'string' }, example: ['Text to Video', 'Image to Video'] },
            taskTags: { type: 'array', items: { type: 'string' }, example: ['text-to-video'] },
            pricingDisplay: { type: 'string', example: '$0.25 / sec' },
            image: { type: 'string', nullable: true },
            gradient: { type: 'string' },
            isNew: { type: 'boolean' },
            isPopular: { type: 'boolean' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ModelDetail: {
          allOf: [
            { $ref: '#/components/schemas/Model' },
            {
              type: 'object',
              properties: {
                modelPlaygroundFields: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PlaygroundField' },
                },
                modelPricingTiers: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PricingTier' },
                },
              },
            },
          ],
        },
        PlaygroundField: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'prompt' },
            label: { type: 'string', example: 'Prompt' },
            type: { type: 'string', enum: ['textarea', 'select', 'toggle', 'options', 'file', 'number'] },
            description: { type: 'string', nullable: true },
            required: { type: 'boolean' },
            placeholder: { type: 'string', nullable: true },
            defaultValue: { type: 'string', nullable: true },
            sortOrder: { type: 'integer' },
            modelFieldOptions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string', example: '1080p' },
                  value: { type: 'string', example: '1080p' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
        PricingTier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Google Veo 3, 720p' },
            category: { type: 'string', enum: ['chat', 'video', 'image', 'music'] },
            provider: { type: 'string' },
            credits: { type: 'number', example: 50 },
            creditUnit: { type: 'string', example: 'per second' },
            ourPrice: { type: 'number', example: 0.25 },
            marketPrice: { type: 'number', nullable: true },
          },
        },
        FeaturedSlide: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            modelName: { type: 'string', example: 'Nano Banana Pro' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            image: { type: 'string', nullable: true },
            href: { type: 'string', example: '/market/nano-banana-pro' },
            gradient: { type: 'string' },
            sortOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },

        // -- Filters --
        FilterCategory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            label: { type: 'string', example: 'Video Generation' },
            sortOrder: { type: 'integer' },
            filterOptions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string', example: 'Text to Video' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
        Provider: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Google DeepMind' },
            sortOrder: { type: 'integer' },
          },
        },

        // -- API Keys --
        CreateApiKeyRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'gemini 3 pro doc du lieu', minLength: 1, maxLength: 200 },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'gemini 3 pro doc du lieu' },
            keyPrefix: { type: 'string', example: '4a1eff90' },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            isRevoked: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiKeyCreated: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            key: { type: 'string', example: 'km_a1b2c3d4e5f6...', description: 'Full API key. Only shown once!' },
            keyPrefix: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // -- Billing --
        CreditPackage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            price: { type: 'number', example: 50 },
            credits: { type: 'integer', example: 10000 },
            badge: { type: 'string', nullable: true, example: 'SAVE 5%' },
            isActive: { type: 'boolean' },
          },
        },
        PurchaseCreditsRequest: {
          type: 'object',
          required: ['packageId'],
          properties: {
            packageId: { type: 'string', format: 'uuid' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            packageId: { type: 'string', format: 'uuid', nullable: true },
            credits: { type: 'integer', example: 10000 },
            amount: { type: 'number', example: 50 },
            type: { type: 'string', enum: ['credit_purchase', 'subscription', 'sepay_topup', 'refund'] },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
            sepayRef: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            subscriptionId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreditBalance: {
          type: 'object',
          properties: {
            balance: { type: 'integer', example: 15000 },
          },
        },

        // -- Subscriptions --
        SubscriptionPlan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Pro' },
            slug: { type: 'string', example: 'pro' },
            description: { type: 'string', nullable: true },
            monthlyPrice: { type: 'number', example: 29.99 },
            yearlyPrice: { type: 'number', example: 299.99 },
            monthlyCredits: { type: 'integer', example: 5000 },
            features: { type: 'array', items: { type: 'string' }, example: ['Priority support', '5000 credits/mo'] },
            isPopular: { type: 'boolean' },
            isActive: { type: 'boolean' },
            sortOrder: { type: 'integer' },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            planId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['active', 'cancelled', 'expired', 'past_due'] },
            billingCycle: { type: 'string', enum: ['monthly', 'yearly'] },
            currentPeriodStart: { type: 'string', format: 'date-time' },
            currentPeriodEnd: { type: 'string', format: 'date-time' },
            cancelledAt: { type: 'string', format: 'date-time', nullable: true },
            plan: { $ref: '#/components/schemas/SubscriptionPlan' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // -- Invoices --
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoiceNumber: { type: 'string', example: 'INV-2026-00001' },
            userId: { type: 'string', format: 'uuid' },
            transactionId: { type: 'string', format: 'uuid', nullable: true },
            subscriptionId: { type: 'string', format: 'uuid', nullable: true },
            status: { type: 'string', enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'] },
            subtotal: { type: 'number', example: 29.99 },
            tax: { type: 'number', example: 0 },
            total: { type: 'number', example: 29.99 },
            currency: { type: 'string', example: 'USD' },
            issuedAt: { type: 'string', format: 'date-time', nullable: true },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            dueDate: { type: 'string', format: 'date', nullable: true },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'integer' },
                  unitPrice: { type: 'number' },
                  amount: { type: 'number' },
                },
              },
            },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // -- Logs --
        Log: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            model: { type: 'string', example: 'nano-banana-2' },
            date: { type: 'string', format: 'date', example: '2026-03-03' },
            time: { type: 'string', example: '15:20:44' },
            duration: { type: 'integer', example: 12 },
            input: { type: 'string', example: '{"aspect_ratio":"16:9"}' },
            status: { type: 'string', enum: ['success', 'failed', 'processing'] },
            creditsConsumed: { type: 'integer', example: 25 },
            taskId: { type: 'string', example: '637f3a682b9dde05e238b4710b138d01' },
            hasResult: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        UsageStats: {
          type: 'object',
          properties: {
            dailyUsage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2026-03-04' },
                  credits: { type: 'integer' },
                },
              },
            },
            endpointUsage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  model: { type: 'string' },
                  credits: { type: 'integer' },
                },
              },
            },
            keyUsage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  apiKeyId: { type: 'string' },
                  credits: { type: 'integer' },
                  lastUsed: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },

        // -- Settings --
        UserSettings: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            theme: { type: 'string', enum: ['light', 'dark'] },
            emailNotifications: { type: 'boolean' },
          },
        },
        UpdateSettingsRequest: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark'] },
            emailNotifications: { type: 'boolean' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 100 },
            avatarUrl: { type: 'string' },
          },
        },
        TeamMember: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            teamOwnerId: { type: 'string', format: 'uuid' },
            role: { type: 'string', example: 'Developer' },
            status: { type: 'string', enum: ['active', 'pending', 'inactive'] },
            invitedAt: { type: 'string', format: 'date-time' },
          },
        },
        WebhookKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            hmacKey: { type: 'string', example: 'whsec_a1b2c3...' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // -- Updates --
        ApiUpdate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date', example: '2026-03-01' },
            tag: { type: 'string', example: 'General API' },
            title: { type: 'string' },
            content: { type: 'string', description: 'Markdown/HTML content' },
          },
        },
        ApiUpdateTag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Video API' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
