# ADSapp Video Tutorial Series - Production Guide

**Version**: 1.0
**Last Updated**: 2025-10-14
**Status**: Production-Ready

## Executive Summary

This guide provides comprehensive technical specifications and production standards for the ADSapp video tutorial series. Follow these guidelines to ensure consistent, professional, and accessible video content across all 20 tutorials.

---

## Technical Specifications

### Video Standards

**Resolution & Format**:
- Primary: 1920x1080 (Full HD) @ 30fps
- Codec: H.264 / AVC
- Bitrate: 8-10 Mbps (VBR)
- Container: MP4
- Color Space: sRGB
- Aspect Ratio: 16:9

**Audio Standards**:
- Sample Rate: 48 kHz
- Bit Depth: 24-bit
- Channels: Stereo (2.0)
- Format: AAC-LC
- Bitrate: 320 kbps
- Loudness: -16 LUFS (±1)
- Dynamic Range: Moderate compression (-8dB to -12dB)

### Recording Setup

**Software Requirements**:
- **Primary**: OBS Studio 29+ (free, open-source)
- **Alternative**: Loom Business, Camtasia 2024
- **Screen Capture**: Full desktop or window-specific
- **Cursor Enhancement**: CursorHighlighter plugin for OBS

**Recording Settings**:
- Canvas Resolution: 1920x1080
- Output Resolution: 1920x1080
- FPS: 30 (constant frame rate)
- Keyframe Interval: 2 seconds
- Profile: High
- Preset: Quality

**Display Configuration**:
- Primary Monitor: 1920x1080 or higher
- Browser Zoom: 100% (125% for detailed forms)
- OS Scaling: 100%
- Hide Desktop Icons: Yes
- Clean Browser: Extensions disabled, bookmarks hidden

### Voice Recording

**Microphone Requirements**:
- **Recommended**: USB condenser microphone (Blue Yeti, Audio-Technica AT2020USB+)
- **Minimum**: Quality headset microphone with pop filter
- **Position**: 6-8 inches from mouth, 45° angle
- **Environment**: Quiet room, minimal echo
- **Pop Filter**: Essential for reducing plosives

**Voice Settings**:
- Gain: -12dB to -6dB (peak levels, leave headroom)
- Noise Gate: -35dB threshold
- Compression: 3:1 ratio, -20dB threshold
- EQ: High-pass filter at 80Hz, slight boost at 2-4kHz
- De-esser: Moderate (reduce sibilance)

**Voice Direction**:
- Tone: Professional, friendly, conversational
- Pace: 140-160 words per minute (moderate)
- Enunciation: Clear, avoid mumbling
- Energy: Consistent, engaged but not over-enthusiastic
- Pauses: Natural breath pauses, avoid "um" and "uh"

---

## Visual Standards

### User Interface Recording

**Browser Setup**:
- Browser: Chrome or Edge (latest stable)
- Window Size: 1280x800 (allows for UI scaling)
- Zoom Level: 100% (125% for forms and inputs)
- Cursor: Default pointer, enhanced via plugin
- Dev Tools: Closed
- Extensions: Disabled or hidden

**Screen Recording Best Practices**:
- Hide unnecessary tabs and windows
- Close notification banners
- Disable operating system notifications
- Clean desktop (no sensitive information)
- Use incognito/private mode for clean browser state
- Pre-load pages to avoid loading states

### Cursor & Highlighting

**Cursor Enhancement**:
- Size: 1.5x normal (48x48 pixels)
- Color: Blue (#2563EB) with white border
- Glow: Subtle blue glow (8px radius, 30% opacity)
- Click Animation: Expanding circle on click
- Movement: Smooth, deliberate (not too fast)

**Highlighting Techniques**:
- **Circles**: Blue stroke (4px), no fill, for attention
- **Arrows**: Simple blue arrows pointing to elements
- **Boxes**: Blue border (3px) around UI components
- **Glow**: Subtle spotlight effect for key areas
- **Annotations**: White text on semi-transparent blue background

### On-Screen Text

**Lower Thirds**:
- Font: Inter SemiBold, 36px
- Color: White with subtle drop shadow
- Position: Bottom left, 80px from edge
- Background: Semi-transparent blue bar (60% opacity)
- Duration: 3-5 seconds
- Animation: Smooth slide-in from left

**Callouts & Labels**:
- Font: Inter Medium, 28px
- Color: White text on blue background
- Padding: 12px horizontal, 8px vertical
- Border Radius: 6px
- Shadow: Subtle drop shadow
- Pointer: Arrow connecting to relevant UI element

**Code & Syntax**:
- Font: JetBrains Mono, 24px
- Color: Syntax highlighting (VS Code Dark+ theme)
- Background: Dark gray box with rounded corners
- Padding: 16px
- Display: Minimum 5 seconds for readability

---

## Branding & Visual Identity

### Logo & Watermark

**Logo Placement**:
- Position: Top right corner
- Size: 120x40 pixels
- Opacity: 15% (subtle, non-distracting)
- Margin: 20px from top and right edges
- Always visible: Yes

**Intro Animation** (5 seconds):
- Logo reveal with smooth animation
- Title fade-in: Video title in Inter Bold, 48px
- Background: Gradient (ADSapp brand blue to lighter blue)
- Audio: Upbeat intro music (5-second clip)

**Outro Screen** (10 seconds):
- Background: ADSapp brand blue
- Logo: Center, full color
- Elements:
  - "Next Video" preview (left panel)
  - Subscribe button (top right)
  - Related links (bottom)
  - Social media icons (bottom right)

### Color Palette

**Primary Colors**:
- ADSapp Blue: #2563EB
- Light Blue: #60A5FA
- Dark Blue: #1E40AF

**Accent Colors**:
- Success Green: #10B981
- Warning Yellow: #F59E0B
- Error Red: #EF4444
- Neutral Gray: #6B7280

**Background Colors**:
- Light: #F9FAFB
- Medium: #E5E7EB
- Dark: #1F2937

### Typography

**Primary Font**: Inter (Google Fonts)
- Headings: Inter Bold (700)
- Body: Inter Medium (500)
- Captions: Inter Regular (400)

**Code Font**: JetBrains Mono
- Monospaced for code examples

**Font Sizes**:
- Main Title: 48px
- Section Headers: 36px
- Body Text: 28px
- Captions: 24px
- Code: 24px

---

## Animation & Transitions

### Transition Standards

**Scene Transitions**:
- Type: Smooth cross-dissolve
- Duration: 0.3-0.5 seconds
- No jarring cuts or wipes
- Maintain audio continuity

**Element Animations**:
- Fade In/Out: 0.3 seconds
- Slide In: 0.4 seconds with ease-out
- Scale/Zoom: 0.5 seconds with ease-in-out
- Highlights: 0.2 seconds pulse animation

**Avoid**:
- Spinning transitions
- 3D effects
- Page curls or flips
- Excessive motion
- Distracting animations

### Annotation Animations

**Appear**:
- Fade in: 0.2 seconds
- Slight scale from 0.9 to 1.0
- Ease-out timing

**Emphasis**:
- Gentle pulse: 0.3 seconds
- Scale from 1.0 to 1.05 to 1.0
- 2-3 pulses maximum

**Disappear**:
- Fade out: 0.2 seconds
- Slight scale from 1.0 to 0.95
- Ease-in timing

---

## Audio Production

### Music

**Background Music**:
- Genre: Corporate, upbeat, ambient
- Tempo: 100-130 BPM
- Volume: -30dB to -35dB (behind narration)
- Sources: Epidemic Sound, Artlist, PremiumBeat
- License: Commercial use, perpetual
- Fade: 2-second fade in/out at scene changes

**Sound Effects**:
- Click Sounds: Subtle, organic
- Success Chimes: Short, pleasant
- Notification Pings: Brief, non-intrusive
- Volume: -20dB (blend with narration)
- Timing: Sync precisely with visual actions

### Voice Mixing

**Narration Levels**:
- Peak: -6dB to -3dB
- Average: -16 LUFS
- Dynamic Range: -8dB to -12dB (compressed)
- No clipping or distortion

**Audio Processing Chain**:
1. Noise Reduction: -12dB to -18dB
2. EQ: High-pass 80Hz, presence boost 2-4kHz
3. Compression: 3:1 ratio, -20dB threshold
4. De-esser: Moderate
5. Limiter: -1dB ceiling
6. Normalize: -16 LUFS

**Quality Checks**:
- No mouth clicks or breaths (edit out)
- Consistent volume throughout
- No background noise or hum
- Clear articulation of technical terms
- Proper pronunciation of product names

---

## Accessibility Standards

### Closed Captions

**Technical Requirements**:
- Format: SRT or VTT
- Encoding: UTF-8
- Line Length: Max 42 characters
- Lines per Frame: Max 2
- Reading Time: Minimum 1 second per caption
- Position: Bottom center, above lower third

**Caption Content**:
- Verbatim narration
- Speaker identification (if multiple speakers)
- Sound effects in [brackets]
- Music cues: [upbeat music playing]
- Technical terms: Spelled correctly
- Acronyms: First use spelled out

**Timing**:
- Sync: ±100ms accuracy
- On-screen: Minimum 1.5 seconds
- Gap: Minimum 0.25 seconds between captions
- Line breaks: At natural speech pauses

### Audio Description

**When Required**:
- Complex visual diagrams
- UI interactions without narration
- Text that appears without being read
- Important visual changes

**Implementation**:
- Extended audio description track
- Narrate visual-only information
- Describe UI elements and their actions
- Explain visual metaphors or animations

### Visual Accessibility

**High Contrast Mode**:
- Text contrast: Minimum 4.5:1 ratio
- UI elements: Minimum 3:1 ratio
- Never rely on color alone
- Use icons with color-coding

**Screen Reader Compatibility**:
- All text readable (not in images)
- Proper heading structure
- Alt text for any visual-only information
- Transcript available in description

---

## File Management & Workflow

### Project Structure

```
ADSapp-Video-Tutorials/
├── 01-Getting-Started/
│   ├── 01-Welcome-to-ADSapp/
│   │   ├── script.md
│   │   ├── raw-footage/
│   │   ├── audio/
│   │   │   ├── narration-raw.wav
│   │   │   ├── narration-processed.wav
│   │   │   └── music-background.mp3
│   │   ├── graphics/
│   │   │   ├── intro-animation.mp4
│   │   │   ├── annotations/
│   │   │   └── lower-thirds/
│   │   ├── project-files/
│   │   │   └── premiere-project.prproj
│   │   ├── exports/
│   │   │   ├── draft-v1.mp4
│   │   │   ├── final-master.mp4
│   │   │   └── captions.srt
│   │   └── metadata/
│   │       ├── youtube-description.txt
│   │       ├── thumbnail.png
│   │       └── tags.txt
│   └── [other videos...]
├── 02-Core-Features/
└── 03-Advanced-Topics/
```

### Naming Conventions

**Files**:
- Video: `adsapp-[category]-[slug]-[version].mp4`
- Audio: `[slug]-narration-[raw|processed].wav`
- Graphics: `[slug]-[element]-[number].png`
- Captions: `[slug]-captions-[language].srt`

**Versions**:
- Draft: `v0.1`, `v0.2`, etc.
- Review: `v1.0`, `v1.1`, etc.
- Final: `final-master.mp4`
- Revisions: `final-r1.mp4`, `final-r2.mp4`

### Backup Strategy

**During Production**:
- Project files: Daily backups to cloud storage
- Raw footage: Backup after each recording session
- Exports: Keep all versions until project completion

**After Completion**:
- Master files: Store indefinitely
- Project files: Archive for 1 year
- Raw footage: Delete after 3 months (if approved)

---

## Quality Assurance

### Pre-Production Checklist

- [ ] Script finalized and approved
- [ ] Demo account prepared with sample data
- [ ] Recording environment quiet and echo-free
- [ ] Microphone tested and levels set
- [ ] Screen recording software configured
- [ ] Browser clean with correct settings
- [ ] Graphics and assets prepared
- [ ] Music tracks selected and downloaded

### Recording Checklist

- [ ] Audio input levels correct (-12dB to -6dB)
- [ ] Screen resolution set to 1920x1080
- [ ] Cursor enhancement enabled
- [ ] Notifications disabled
- [ ] Clean desktop and browser
- [ ] Script accessible for reference
- [ ] Water available (prevent dry mouth)
- [ ] Multiple takes recorded for options

### Post-Production Checklist

- [ ] Audio noise reduction applied
- [ ] Audio levels normalized to -16 LUFS
- [ ] Background music added and mixed
- [ ] Annotations and callouts added
- [ ] Transitions smooth and consistent
- [ ] Branding elements present (logo, intro, outro)
- [ ] Closed captions generated and synced
- [ ] Color correction applied if needed
- [ ] Final export meets technical specs
- [ ] Quality review by second person

### Pre-Publish Checklist

- [ ] Video plays without errors
- [ ] Audio is clear and balanced
- [ ] Captions sync correctly
- [ ] Thumbnail created and optimized
- [ ] YouTube title optimized (50-60 characters)
- [ ] Description comprehensive (200-300 words)
- [ ] Tags added (15-20 relevant tags)
- [ ] Timestamp chapters added
- [ ] End screen configured with CTAs
- [ ] Playlist assignment confirmed
- [ ] Cards added for related videos

---

## Platform-Specific Guidelines

### YouTube

**Upload Settings**:
- Category: Education or Science & Technology
- Privacy: Public (or Scheduled)
- Age Restriction: None
- Comments: Enabled, moderated
- Allow Embedding: Yes
- Publish to Subscriptions Feed: Yes
- Default License: Standard YouTube License

**Optimization**:
- Title: 50-60 characters, keyword-rich
- Description: Comprehensive (200-300 words)
- Tags: 15-20 relevant tags
- Thumbnail: 1280x720, under 2MB, JPG or PNG
- Chapters: Timestamp markers in description
- End Screen: Last 20 seconds
- Cards: 3-5 cards throughout video

**Playlist Organization**:
- Getting Started Series
- Core Features Series
- Advanced Topics Series
- Quick Tips (shorter clips)

### Vimeo (Enterprise)

**Upload Settings**:
- Privacy: Password protected or Private
- License: All Rights Reserved
- Download: Disabled
- Comments: Disabled
- Embed: Whitelist only

**Use Cases**:
- Internal training
- Customer onboarding
- Enterprise customer private access

### Help Center Integration

**Embedding**:
- Platform: Wistia or native HTML5 player
- Controls: Full player controls enabled
- Autoplay: Disabled
- Quality: Auto-select based on connection
- Transcript: Displayed below video
- Related Articles: Linked in sidebar

---

## Performance Optimization

### File Size Optimization

**Target Sizes**:
- 5-minute video: 80-120 MB
- 10-minute video: 160-240 MB
- Bitrate: 8-10 Mbps average

**Optimization Techniques**:
- Two-pass encoding for better quality/size ratio
- Remove unnecessary frames (idle time)
- Optimize keyframes (every 2 seconds)
- Use variable bitrate (VBR) not constant (CBR)

### Loading Speed

**YouTube**:
- Upload during off-peak hours
- Use YouTube Studio uploader (more reliable)
- Wait for HD processing to complete

**Website Embedding**:
- Use lazy loading for below-fold videos
- Thumbnail image with play button overlay
- Load player library async
- Implement video CDN (Cloudflare, Bunny)

---

## Analytics & Measurement

### Key Metrics to Track

**Engagement**:
- View count
- Watch time (total and average)
- Audience retention (where viewers drop off)
- Likes/dislikes ratio
- Comments (quantity and sentiment)
- Shares and embeds

**Performance**:
- Click-through rate (thumbnail performance)
- Traffic sources (search, suggested, external)
- Audience demographics
- Device types (desktop vs mobile)
- Geography

**Business Impact**:
- Trial sign-ups from video links
- Support ticket reduction for covered topics
- Feature adoption rates
- Time to first value for new users

### A/B Testing

**Elements to Test**:
- Thumbnail designs (2-3 variations)
- Title phrasing
- Description format
- Video length (condensed vs comprehensive)
- Intro duration (3 vs 5 vs 10 seconds)

**Testing Process**:
1. Create variations
2. Run for 7-14 days
3. Analyze metrics
4. Apply learnings to future videos

---

## Legal & Compliance

### Copyright

**Music**:
- Only use properly licensed music
- Keep license certificates
- Credit in description if required

**Software**:
- ADSapp: Own product, full rights
- Third-party tools: Ensure license allows screen recording
- Avoid showing copyrighted content

### Privacy

**Personal Data**:
- Use demo accounts, not real customer data
- Blur any sensitive information
- No real phone numbers or emails visible
- No real customer names

**Compliance**:
- GDPR: No EU customer data without consent
- CCPA: No California resident data
- COPPA: Content is not directed at children

### Accessibility

**Legal Requirements**:
- ADA compliance: Captions and transcripts
- Section 508: Government contractor compliance
- WCAG 2.1 Level AA: Web content accessibility

---

## Budget & Resources

### Per-Video Cost Estimate

**Labor**:
- Scripting: 2-3 hours @ $50/hr = $100-150
- Recording: 1-2 hours @ $50/hr = $50-100
- Editing: 3-5 hours @ $50/hr = $150-250
- Review: 1 hour @ $50/hr = $50

**Services**:
- Voice talent (if outsourced): $100-200
- Music licensing: $15-30 per track
- Graphics (if outsourced): $50-100

**Software**:
- OBS Studio: Free
- DaVinci Resolve: Free (or $295 Studio)
- Adobe Premiere Pro: $20/month
- Epidemic Sound: $15/month (or Artlist $199/year)

**Total per video**: $225-380 (in-house) or $515-880 (outsourced)

### Series Total

**20 videos @ $225-380 each**: $4,500-7,600 in-house
**20 videos @ $515-880 each**: $10,300-17,600 outsourced

### ROI Justification

**Savings**:
- Support ticket reduction: $10,000-20,000/year
- Onboarding efficiency: $5,000-10,000/year
- Feature adoption (increased retention): $30,000-60,000/year

**Revenue**:
- Trial conversion improvement: $50,000-100,000/year

**Total Annual Value**: $95,000-190,000
**ROI**: 1,300-2,500% (in-house) or 550-1,200% (outsourced)

---

## Continuous Improvement

### Feedback Collection

**Sources**:
- YouTube comments and ratings
- In-app feedback forms
- Support team insights
- Customer success interviews
- User testing sessions

**Action**:
- Review feedback monthly
- Identify common requests
- Update videos annually
- Create supplementary content

### Update Strategy

**When to Update**:
- Major UI changes (within 1 month)
- Feature additions (quarterly review)
- User confusion patterns (as needed)
- Accuracy issues (immediately)

**Update Process**:
1. Identify outdated sections
2. Re-record specific scenes
3. Edit into existing video
4. Update captions and description
5. Add "Updated [Date]" note
6. Republish or upload new version

---

## Contact & Support

**Production Team**:
- Video Producer: production@adsapp.com
- Script Writer: content@adsapp.com
- Graphic Designer: design@adsapp.com
- QA Reviewer: qa@adsapp.com

**Questions**: video-production-guide@adsapp.com

---

**Document Version**: 1.0
**Last Review**: 2025-10-14
**Next Review**: 2025-11-14
**Owner**: Content & Education Team
