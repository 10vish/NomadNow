# 🏝️ NomadNow - Travel Planner with Weather

[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://your-username.github.io/nomadnow)
[![Lighthouse Score](https://img.shields.io/badge/lighthouse-90%2B-brightgreen)](https://developers.google.com/web/tools/lighthouse)
[![WCAG 2.1 AA](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-blue)](https://www.w3.org/WAI/WCAG21/quickref/)

A **production-quality, browser-only** travel planning application that helps you plan perfect trips with **weather-aware insights**, smart **packing checklists**, and intuitive **itinerary building**. Built with vanilla HTML, CSS, and JavaScript for maximum compatibility and performance.

![NomadNow Screenshot](assets/nomadnow-logo.png)

## ✨ Features

### 🌤️ Weather-Aware Planning
- **7-day weather forecasts** with detailed daily breakdowns
- **Smart activity suggestions** based on weather conditions
- **Temperature and precipitation insights** for better planning
- **Sunrise/sunset times** for optimal scheduling

### 📋 Smart Packing Lists
- **Auto-generated packing recommendations** based on weather forecast
- **Categorized lists** (Essentials, Clothing, Weather-specific, Toiletries)
- **Interactive checkboxes** with persistent state
- **Custom item addition** for personalized needs

### 📅 Itinerary Builder
- **Day-by-day activity planning** with time slots
- **Drag-and-drop activity management** (coming soon)
- **Weather-aware activity suggestions**
- **Export to text files** or **shareable links**

### 🔧 Technical Excellence
- **100% client-side** - no server required
- **Offline-ready** with localStorage persistence
- **WCAG 2.1 AA accessibility** compliance
- **Lighthouse score ≥ 90** across all metrics
- **Progressive Web App** ready

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Visit `https://your-username.github.io/nomadnow`

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/your-username/nomadnow.git
cd nomadnow

# Start a local server (choose one)
python -m http.server 8000        # Python 3
python -m SimpleHTTPServer 8000   # Python 2
npx serve .                       # Node.js
php -S localhost:8000             # PHP

# Open in browser
open http://localhost:8000
```

### Option 3: Direct File Access
Simply open `index.html` in any modern web browser. Note: Some features may be limited due to CORS restrictions when accessing APIs.

## 🏗️ Project Structure

```
nomadnow/
├── index.html              # Main application entry point
├── styles.css              # Complete styling and responsive design
├── app.js                  # Core application logic and API integration
├── assets/
│   ├── nomadnow-logo.png   # Application logo
│   └── icons/              # Additional icons (if needed)
├── .github/
│   └── copilot-instructions.md  # Development guidelines
└── README.md               # This file
```

## 🔌 API Integration

NomadNow uses **keyless, public APIs** for maximum accessibility:

### Primary APIs
- **[Open-Meteo Geocoding](https://geocoding-api.open-meteo.com/)** - Location search and coordinates
- **[Open-Meteo Weather](https://api.open-meteo.com/)** - Weather forecasts and conditions
- **[Sunrise-Sunset](https://api.sunrise-sunset.org/)** - Daylight information

### Optional APIs
- **[Nager.Date](https://date.nager.at/)** - Public holidays information
- **[ExchangeRate.host](https://exchangerate.host/)** - Currency conversion

### API Features
- **Client-side caching** (1-hour TTL) for performance
- **Debounced requests** (300ms) to prevent API spam
- **Retry logic** with exponential backoff
- **Graceful error handling** with user feedback

## 🎨 Design System

### Color Palette
```css
--primary-color: #0f766e     /* Teal - main brand color */
--primary-dark: #134e4a      /* Dark teal - hover states */
--primary-light: #14b8a6     /* Light teal - accents */
--secondary-color: #64748b   /* Slate - secondary elements */
```

### Typography
- **Font Family**: Inter (Google Fonts) with system fallbacks
- **Responsive scaling** using CSS custom properties
- **Accessibility-focused** contrast ratios

### Components
- **Modern card-based layouts** with subtle shadows
- **Gradient backgrounds** for visual hierarchy
- **Smooth animations** and transitions (respects `prefers-reduced-motion`)
- **Mobile-first responsive design**

## 📱 Browser Compatibility

### Supported Browsers
- ✅ **Chrome** 88+ (2021)
- ✅ **Firefox** 85+ (2021)
- ✅ **Safari** 14+ (2020)
- ✅ **Edge** 88+ (2021)

### Progressive Enhancement
- **Graceful degradation** for older browsers
- **Feature detection** before API usage
- **Fallback experiences** when APIs are unavailable

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance
- **Keyboard navigation** support throughout
- **Screen reader compatibility** with proper ARIA labels
- **Color contrast ratios** meeting accessibility standards
- **Focus management** for modal dialogs and forms

### Inclusive Design
- **High contrast mode** support
- **Reduced motion** preference respect
- **Scalable text** up to 200% zoom
- **Alternative text** for all images

## 🛠️ Development

### Prerequisites
- Modern web browser
- Text editor or IDE
- Optional: Local web server for development

### Development Workflow
1. **Edit files** directly - no build process required
2. **Test locally** using any web server
3. **Deploy** by uploading files to any static host
4. **Monitor** using browser dev tools

### Code Organization
- **Modular JavaScript** with clear separation of concerns
- **CSS custom properties** for maintainable theming
- **Semantic HTML** with proper document structure
- **Progressive enhancement** philosophy

### Performance Optimizations
- **Minimal dependencies** (no frameworks)
- **Efficient API caching** strategy
- **Optimized images** and assets
- **Lazy loading** for non-critical features

## 🚀 Deployment Options

### Static Hosting Services
- **GitHub Pages** - Free with custom domains
- **Netlify** - Advanced features and CDN
- **Vercel** - Optimized for performance
- **Surge.sh** - Simple command-line deployment

### CDN Integration
- **Cloudflare** - Global performance and security
- **AWS CloudFront** - Enterprise-grade CDN
- **jsDelivr** - Free CDN for static assets

### Custom Domains
```bash
# Example CNAME setup
CNAME: travel.yourdomain.com → your-username.github.io
```

## 📊 Performance Metrics

### Lighthouse Scores (Target)
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 90+
- **SEO**: 85+

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## 🔒 Privacy & Security

### Data Handling
- **No personal data collection** or tracking
- **Local storage only** - data never leaves the device
- **No authentication required** - completely anonymous
- **GDPR compliant** by design

### Security Features
- **No external scripts** beyond fonts and APIs
- **Content Security Policy** ready
- **HTTPS enforcement** recommended
- **No cookies** or tracking mechanisms

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Make your changes
3. Test thoroughly across browsers
4. Submit a pull request

### Contribution Guidelines
- **Maintain performance** - no unnecessary dependencies
- **Follow accessibility standards** - test with screen readers
- **Preserve offline functionality** - ensure graceful degradation
- **Document your changes** - update README if needed

### Development Standards
- **Vanilla JavaScript** only - no frameworks
- **Progressive enhancement** approach
- **Mobile-first** responsive design
- **Semantic HTML** structure

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Open-Meteo** for free weather API access
- **Google Fonts** for the Inter typeface
- **Travel community** for feature inspiration
- **Accessibility advocates** for inclusive design guidance

## 📞 Support

### Documentation
- **API Documentation**: Refer to individual API provider docs
- **Browser Support**: Check caniuse.com for feature compatibility
- **Accessibility**: W3C WCAG guidelines

### Community
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for feature requests
- **Documentation**: Wiki for additional guides

---

**Happy Traveling! 🌍** 

*Built with ❤️ for the global travel community*