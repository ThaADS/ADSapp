# ADSapp Video Production - Editing Guidelines

Comprehensive post-production editing guidelines for professional, consistent video output.

---

## Post-Production Workflow Overview

```
1. INGEST → Import footage and organize
2. ASSEMBLE → Create rough cut from best takes
3. REFINE → Trim, pace, and structure
4. ENHANCE → Add graphics, callouts, transitions
5. AUDIO → Mix narration, music, effects
6. COLOR → Color correction and grading
7. REVIEW → Quality control check
8. EXPORT → Render final deliverables
9. DELIVER → Upload and publish
```

**Estimated Editing Time per Video**: 3-8 hours depending on complexity

---

## Software Setup & Project Configuration

### Recommended Editing Software

**Professional Tier**:

- Adobe Premiere Pro CC (Industry standard)
- Final Cut Pro X (Mac, excellent performance)
- DaVinci Resolve Studio ($295, powerful color + editing)

**Budget Tier**:

- DaVinci Resolve (Free version, very capable)
- Camtasia (Great for screen recordings)
- ScreenFlow (Mac, screen recording focused)

### Project Settings

```
Sequence Settings:
- Frame Size: 1920x1080 (1080p)
- Frame Rate: 30fps (smooth, web-optimized)
- Pixel Aspect Ratio: Square
- Field Order: Progressive
- Audio: 48kHz, 16-bit

Export Settings:
- Format: H.264 (MP4)
- Bitrate: 8-12 Mbps (VBR, 2-pass)
- Audio: AAC, 192kbps, Stereo
```

### Folder Structure

```
ADSapp_Video_[##]_[Title]/
├── 01_Raw_Footage/
│   ├── Takes/
│   ├── B-Roll/
│   └── Audio/
├── 02_Assets/
│   ├── Graphics/
│   ├── Music/
│   ├── SFX/
│   └── Fonts/
├── 03_Project_Files/
│   ├── Premiere/
│   ├── After_Effects/
│   └── Photoshop/
├── 04_Exports/
│   ├── Drafts/
│   ├── Review/
│   └── Final/
└── 05_Deliverables/
    ├── Master/
    ├── YouTube/
    ├── Social/
    └── Thumbnails/
```

---

## Phase 1: Ingest and Organization (30-60 min per video)

### Import Media

- [ ] Import all video takes to project
- [ ] Import audio separately if recorded in post
- [ ] Import graphics assets (logos, icons, callouts)
- [ ] Import background music
- [ ] Import sound effects
- [ ] Verify all media linked correctly

### Organize Footage

- [ ] Create bins for each video
- [ ] Label clips clearly:
      `V01_Welcome_Take01.mp4`
      `V01_Welcome_Take02_BEST.mp4`
- [ ] Color-code clips:
  - Green = Best take
  - Yellow = Alternate take
  - Red = Do not use
- [ ] Add markers for key moments
- [ ] Transcribe narration if not already done

### Create Sequences

- [ ] Create sequence for each video
- [ ] Name: `ADSapp_V[##]_[Title]_Edit_v01`
- [ ] Verify sequence settings match project specs
- [ ] Create additional sequences:
  - `_Rough_Cut`
  - `_Fine_Cut`
  - `_Final`

---

## Phase 2: Assembly Edit (2-3 hours per video)

### Build Rough Cut

- [ ] Lay down best takes in order
- [ ] Use script as guide
- [ ] Include all content, don't worry about timing yet
- [ ] Mark sections to cut/tighten
- [ ] Leave gaps for graphics and callouts

### Audio Selection

- [ ] Choose best audio takes
- [ ] Mark breaths to remove
- [ ] Note sections needing audio repair
- [ ] Sync with video if separately recorded
- [ ] Add placeholder silence for timing

### Structure Check

- [ ] Verify all script points covered
- [ ] Check introduction hooks audience
- [ ] Confirm logical section flow
- [ ] Ensure conclusion summarizes and has CTA
- [ ] Match storyboard scene order

---

## Phase 3: Fine Cut and Pacing (2-4 hours per video)

### Timing and Pacing

**Target Pace**:

- Introduction: Fast (10-30 seconds)
- Tutorial sections: Moderate (viewers follow along)
- Complex steps: Slower (give time to comprehend)
- Conclusion: Fast (momentum to next video)

**Editing Techniques**:

1. **J-Cuts and L-Cuts**: Audio leads or trails video for smooth transitions
2. **Jump Cuts**: Remove pauses, "ums," and dead air
3. **Speed Ramping**: Speed up repetitive actions (200%-300%)
4. **Freeze Frames**: Pause on important UI elements (1-2 seconds)

### Cut Points

- [ ] Remove all "ums," "uhs," "likes"
- [ ] Eliminate long pauses (> 2 seconds)
- [ ] Cut out mistakes and retakes
- [ ] Tighten gaps between sentences
- [ ] Speed up slow mouse movements
- [ ] Remove loading screens or render waits

### Rhythm and Flow

- [ ] Vary pace to maintain engagement
- [ ] Build energy toward conclusions
- [ ] Allow breathing room after complex concepts
- [ ] Match cuts to music beats when possible
- [ ] Test 1.25x playback speed (should still be clear)

---

## Phase 4: Graphics and Callouts (2-3 hours per video)

### Lower Thirds

**When to Use**: Speaker introductions, section titles

**Design Specs**:

- Position: Bottom third of frame
- Font: Inter Bold 32pt
- Background: ADSapp blue (#007AFF) with 80% opacity
- Animation: Fade in 0.3s, hold 3s, fade out 0.3s
- Safe zone: 10% margin from edges

**Standard Lower Thirds**:

- Video title card: 5 seconds at start
- Section headers: 3 seconds each
- Speaker name: 5 seconds on first appearance

### Callouts and Annotations

**Types**:

1. **Arrows**: Point to specific UI elements
2. **Boxes**: Highlight areas of interest
3. **Text Labels**: Explain features or actions
4. **Circles**: Focus attention on specific points
5. **Numbers**: Step sequences (1, 2, 3)

**Design Standards**:

- Color: ADSapp blue (#007AFF) primary, yellow (#FF9500) for warnings
- Line Weight: 4-6px
- Text: Inter Regular 24pt
- Animation: Fade in 0.2s
- Timing: Appear as element is discussed, disappear after

**Best Practices**:

- Don't over-annotate (clutters screen)
- Use sparingly for truly important elements
- Match annotation duration to narration
- Keep consistent style across all videos
- Test readability at 720p (mobile viewing)

### Animated Graphics

**Icon Animations**:

- Feature icons appear with subtle bounce
- Duration: 0.5s
- Easing: Ease out

**Workflow Diagrams**:

- Build step-by-step with narration
- Each element appears individually
- Connect with animated lines
- Color-code by function

**Chart Animations**:

- Numbers count up from zero
- Line graphs draw in smoothly
- Bar charts grow from bottom
- Pie charts fill clockwise
- Duration: 1.5-2 seconds

### Text Overlays

**Key Takeaways**:

```
Format:
✓ Key Point Here
✓ Another Key Point
✓ Third Key Point

Position: Center screen
Duration: 3-5 seconds
Font: Inter Bold 36pt
Background: Semi-transparent dark (#000 @ 70%)
```

**Keyboard Shortcuts**:

```
Format:
⌘ + K  |  Ctrl + K
Universal Search

Position: Bottom right
Duration: 2 seconds
Font: Courier New 28pt (monospace)
```

---

## Phase 5: Audio Post-Production (1-2 hours per video)

### Audio Levels (Target Mix)

```
Narration Peak: -3dB to -6dB
Narration Average: -12dB to -15dB
Background Music: -18dB to -24dB (under narration)
Sound Effects: -12dB to -15dB
Ambient/Room Tone: -40dB to -50dB
```

### Audio Cleanup Process

1. **Noise Reduction**:
   - Use noise profile from room tone
   - Apply subtle reduction (6-10dB)
   - Don't over-process (sounds robotic)

2. **EQ (Equalization)**:
   - High-pass filter: 80-100Hz (remove rumble)
   - Boost presence: 2-5kHz (clarity)
   - Cut harshness: 8-10kHz if needed

3. **Compression**:
   - Ratio: 3:1 to 4:1
   - Threshold: -18dB
   - Attack: 5-10ms
   - Release: 50-100ms
   - Makeup gain: 3-6dB

4. **De-esser**:
   - Target frequency: 6-8kHz
   - Threshold: As needed to reduce sibilance

5. **Limiting**:
   - Ceiling: -1dB (prevent clipping)
   - Only on final mix

### Music Integration

**Background Music Requirements**:

- Royalty-free or properly licensed
- Instrumental only (no vocals)
- Non-distracting (avoid strong melodies)
- Consistent energy level
- Loop-able for different durations

**Music Placement**:

- Introduction: 0:00-0:30 (energetic)
- Sections: Subtle underscore throughout
- Conclusion: Last 30 seconds (builds momentum)
- Transitions: Subtle musical cues

**Mixing Music**:

- [ ] Use ducking/side-chain compression
- [ ] Lower music when narration starts
- [ ] Raise slightly during pauses
- [ ] Fade out smoothly at end (3-4 seconds)
- [ ] Match energy to video pacing

### Sound Effects

**When to Use**:

- UI interactions (clicks, swipes)
- Notifications and alerts
- Success/completion moments
- Transitions between sections
- Error or warning situations

**Sourcing**:

- Freesound.org
- ZapSplat
- Epidemic Sound
- AudioJungle
- Create custom if needed

**Integration**:

- Match to on-screen action precisely (within 2 frames)
- Keep subtle (don't overpower narration)
- Use consistently for similar actions
- Avoid overuse (every click not needed)

---

## Phase 6: Color Correction and Grading (30-60 min per video)

### Primary Color Correction

**Goals**:

- Consistent white balance across all shots
- Proper exposure (not too bright or dark)
- Accurate skin tones (if presenter on camera)
- Vibrant but realistic colors

**Process**:

1. **Set White Balance**: Use white/gray card reference
2. **Adjust Exposure**: Histogram should be balanced
3. **Contrast**: Add definition without crushing blacks
4. **Saturation**: Slight boost for vibrancy (5-10%)

### Color Grading for Brand

**ADSapp Color Profile**:

- Slight cool tone (modern, tech-forward)
- Boost blues for brand alignment
- Maintain accurate UI colors
- Avoid heavy grading that looks "filtered"

**LUT (Look-Up Table)**:

- Create consistent look across all videos
- Apply as adjustment layer
- Fine-tune per shot as needed

### Screen Recordings

**Special Considerations**:

- Don't grade UI heavily (colors should be accurate)
- Slight sharpening acceptable (1.0-1.2)
- Ensure text remains readable
- Check white backgrounds don't blow out

---

## Phase 7: Transitions and Effects (1-2 hours per video)

### Transition Types

**Primary**: Straight Cuts (90% of edits)

- Fast, clean, professional
- No unnecessary "flash"

**Secondary**: Dissolves/Cross Fade (10% of edits)

- Between major sections
- Time passage
- Softening effect
- Duration: 0.3-0.5 seconds

**Avoid**:

- Star wipes, page curls, etc.
- Over-the-top transitions
- Anything distracting

### Effects and Filters

**Zoom/Pan (Push In)**:

- Highlight specific UI element
- Duration: 1-2 seconds
- Max zoom: 150% (maintain quality)
- Ease in and out smoothly

**Picture-in-Picture**:

- Show presenter explaining while UI visible
- Position: Bottom right corner
- Size: 20% of frame
- Border: 2px white for separation

**Screen Shake**:

- Avoid unless showing error/problem
- Subtle if used (2-3px movement)

---

## Phase 8: Captions and Accessibility (1-2 hours per video)

### Caption Requirements

**Format**: SRT (SubRip) or VTT (WebVTT)

**Styling**:

- Font: Arial or Helvetica
- Size: 24-28pt (readable on mobile)
- Color: White text, black background (or semi-transparent)
- Position: Bottom center
- Max Lines: 2
- Max Characters per Line: 42

**Timing**:

- Sync precisely with audio
- 3-word minimum per caption
- Display 1-6 seconds (reading time)
- 0.3s gap between captions minimum

**Accuracy**:

- [ ] Word-for-word transcription
- [ ] Proper punctuation
- [ ] No errors or typos
- [ ] Include [Sound Effect] descriptions
- [ ] [Music Playing] for background music

### Accessibility Checklist

- [ ] Captions cover 100% of narration
- [ ] Sound effects described in captions
- [ ] Text overlays readable (high contrast)
- [ ] Color not sole conveyor of information
- [ ] Flashing/strobing avoided (epilepsy concern)
- [ ] Keyboard shortcuts shown, not just said

### Creating Captions

**Options**:

1. **Manual**: Type in editor (most accurate, time-consuming)
2. **Auto + Edit**: YouTube auto-captions + corrections (fast, needs cleanup)
3. **Service**: Rev.com ($1.50/min), Descript auto-transcription
4. **Software**: Premiere Auto-transcribe, Descript

**Process**:

1. Export audio/video to caption service or software
2. Import generated captions
3. Review and correct errors
4. Adjust timing for readability
5. Export SRT/VTT file
6. Embed in final video or upload separately

---

## Phase 9: Quality Control Review (30-60 min per video)

### Technical QC Checklist

**Video**:

- [ ] Resolution: 1920x1080
- [ ] Frame rate: 30fps consistent
- [ ] No dropped frames
- [ ] No stuttering or glitches
- [ ] Color consistent throughout
- [ ] Text readable at 720p (mobile test)
- [ ] Thumbnail looks good at small size

**Audio**:

- [ ] Levels consistent (-3dB to -6dB peak)
- [ ] No clipping or distortion
- [ ] Background music not overpowering
- [ ] No sudden volume changes
- [ ] Sync with video perfect throughout
- [ ] Clean start and end (no pops)

**Content**:

- [ ] All script points covered
- [ ] No factual errors
- [ ] Demonstrations work correctly
- [ ] Graphics/callouts accurate
- [ ] Timestamps match actual timing
- [ ] Calls-to-action clear

**Branding**:

- [ ] Logo appears correctly
- [ ] Colors match brand guidelines
- [ ] Fonts consistent
- [ ] Lower thirds styled correctly
- [ ] End screen has proper links

### Review Process

**Self-Review**:

1. Watch video start to finish without pausing
2. Make notes of issues (timestamps)
3. Watch again at 1.5x speed (pacing check)
4. Watch with sound off (visual clarity)
5. Listen with eyes closed (audio quality)

**Peer Review**:

1. Share draft with 2-3 colleagues
2. Ask specific questions:
   - "Is this step clear?"
   - "Does the pacing work?"
   - "Any confusing moments?"
3. Implement feedback
4. Re-export if significant changes

**Test View**:

1. Watch on different devices:
   - Desktop (1080p)
   - Tablet (720p)
   - Phone (480p)
2. Check with headphones and speakers
3. Test with captions on/off
4. Verify links and end screen work

---

## Phase 10: Export and Delivery (30-60 min per video)

### Export Settings

**Master File** (Archive Quality):

```
Format: ProRes 422 or H.264 High Profile
Resolution: 1920x1080
Frame Rate: 30fps
Bitrate: 20-50 Mbps (ProRes) or 15-20 Mbps (H.264)
Audio: 48kHz, 24-bit, AAC 320kbps
Use: Archive, re-editing later
```

**YouTube Upload** (Distribution Quality):

```
Format: H.264 (MP4)
Resolution: 1920x1080
Frame Rate: 30fps
Bitrate: 10-12 Mbps (VBR, 2-pass encoding)
Audio: 48kHz, 16-bit, AAC 192kbps
Max File Size: < 128GB (YouTube limit)
```

**Social Media** (Optimized):

```
Instagram/Facebook:
- Square: 1080x1080
- Vertical: 1080x1920
- Duration: <60s or <15min
- Bitrate: 8 Mbps

LinkedIn:
- Same as YouTube settings
- Add captions burned-in

Twitter:
- Same as YouTube
- File size: < 512MB
- Duration: < 2:20
```

### Export Checklist

- [ ] Verify export settings one more time
- [ ] Sufficient disk space (2-5GB per video)
- [ ] Close other applications (faster export)
- [ ] Export to fast SSD, not network drive
- [ ] Name: `ADSapp_V[##]_[Title]_Final_[Date].mp4`
- [ ] Start export, monitor for errors
- [ ] Don't interrupt or shut down during export

### Post-Export Verification

- [ ] Play exported file start to finish
- [ ] Check first 10 seconds (intro)
- [ ] Scrub through for glitches
- [ ] Check last 10 seconds (end screen)
- [ ] Verify audio throughout
- [ ] Test on different media player
- [ ] Compare to master timeline (spot check)

### Deliverables Checklist

- [ ] Final video (MP4)
- [ ] Captions file (SRT)
- [ ] Thumbnail (1280x720 JPG)
- [ ] Title and description (TXT)
- [ ] Timestamps/chapters (TXT)
- [ ] Project file (backed up)
- [ ] Assets archive (for future editing)

---

## Thumbnail Creation

### Design Specs

```
Dimensions: 1280x720px
Format: JPG or PNG
File Size: < 2MB
Aspect Ratio: 16:9
Safe Zone: 10% margin from edges
```

### Design Elements

**Must Include**:

- Video number (V01, V02, etc.)
- Clear, short title (5-7 words max)
- ADSapp branding/logo
- Relevant visual (screenshot or icon)
- High contrast for small display

**Design Tips**:

- Use bold, sans-serif fonts (readable small)
- Limit to 3 colors + black/white
- Avoid small text (illegible at 160x90px)
- Face thumbnails (if presenter) = higher CTR
- Consistent template across series

**Tools**:

- Canva (easiest, templates available)
- Photoshop (most flexible)
- Figma (collaborative)

---

## Editing Efficiency Tips

1. **Use Keyboard Shortcuts**: Learn your editor's shortcuts - 50% time savings
2. **Create Templates**: Lower thirds, transitions, etc. for quick reuse
3. **Batch Processing**: Color grade/audio process multiple clips at once
4. **Proxy Workflows**: Edit with lower-res proxies, export with high-res
5. **Render in Sections**: Render as you go to preview smoothly
6. **Auto-Save**: Enable auto-save every 5 minutes
7. **Duplicate Projects**: "Save As" for each editing stage
8. **Use Markers**: Color-coded markers for different tasks
9. **Nest Sequences**: Group complex sections for easier management
10. **Plugin Presets**: Save common effects chains as presets

---

## Editing Timeline Estimate

| Video Type                   | Footage   | Editing Hours |
| ---------------------------- | --------- | ------------- |
| Simple Tutorial (5-7 min)    | 15-20 min | 4-6 hours     |
| Standard Feature (8-10 min)  | 25-35 min | 6-8 hours     |
| Advanced Feature (12-15 min) | 40-50 min | 8-12 hours    |

**Total for 20 Videos**: 120-160 hours (15-20 full days)

---

## Common Editing Mistakes to Avoid

1. **Over-Editing**: Too many effects distract from content
2. **Music Too Loud**: Background music overpowers narration
3. **Too Fast**: Viewers can't keep up with steps
4. **Too Slow**: Boring pace loses attention
5. **Inconsistent Style**: Different looks between videos
6. **Missing CTAs**: Forget to tell viewers what to do next
7. **Poor Transitions**: Jarring cuts between sections
8. **Ignoring Mobile**: Doesn't work on small screens
9. **No QC**: Exporting without watching final cut
10. **Losing Project Files**: Not backing up work

---

**Editing guidelines complete! Your videos are now production-ready.**

**Next Steps**:

1. Upload to YouTube/platform
2. Add metadata (title, description, tags)
3. Create playlist structure
4. Configure end screens and cards
5. Schedule publishing
6. Promote on social media
7. Monitor analytics and engagement
