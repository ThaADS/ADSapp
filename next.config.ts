import type { NextConfig } from "next";

// Extended config type to include eslint settings
interface ExtendedNextConfig extends NextConfig {
  eslint?: {
    ignoreDuringBuilds?: boolean;
  };
}

const nextConfig: ExtendedNextConfig = {
  /* config options here */
  eslint: {
    // ESLint checking enabled during builds
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TypeScript strict checking enabled
    ignoreBuildErrors: false,
  },
  // 🔒 SECURITY: Removed env block - secrets must NEVER be exposed to client
  // Server-side code automatically reads from process.env
  // Only NEXT_PUBLIC_* variables need explicit exposure

  // Bundle Analyzer (only when not using Turbopack)
  ...(process.env.TURBOPACK !== '1' && {
    webpack: (config: any, { isServer }: { isServer: boolean }) => {
      if (process.env.ANALYZE === 'true') {
        // Dynamic import for bundle analyzer to avoid loading in production
        const { BundleAnalyzerPlugin } = eval('require')('webpack-bundle-analyzer');
        config.plugins?.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
            openAnalyzer: false,
          })
        );
      }

      // Performance optimizations
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };
      }

      return config;
    },
  }),

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers - Enterprise-grade protection
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // DNS Prefetch Control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          // Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // Frame Options - Prevent Clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Content Type Options - Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy - Control browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy - Comprehensive XSS protection
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vercel.live wss://ws-*.pusher.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "media-src 'self'",
              "worker-src 'self' blob:",
            ].join('; ')
          },
        ],
      },
    ];
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // External packages for server components (moved from experimental)
  serverExternalPackages: ['@supabase/supabase-js'],

  // Enable experimental features
  experimental: {
    // 🚀 PERFORMANCE: Enable optimized package imports (tree-shaking)
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react',
      'recharts',
      'reactflow',
      '@stripe/stripe-js',
      'date-fns',
    ],
    // Speed up server-side code changes
    serverComponentsHmrCache: true,
    // Optimize CSS
    optimizeCss: true,
  },

  // 🚀 PERFORMANCE: Modular imports for tree-shaking
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },

  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    // Turbopack is enabled by default when using --turbopack flag
    // Additional configuration can be added here as features become available
  },

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && process.env.VERCEL === '1' && {
    output: 'standalone', // Only for Vercel deployment, not local testing
    poweredByHeader: false,

    // Compression
    compress: true,

    // Static optimization
    trailingSlash: false,

    // Asset optimization
    assetPrefix: process.env.CDN_URL || '',
  }),
};

export default nextConfig;
