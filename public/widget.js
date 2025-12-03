/**
 * ADSapp WhatsApp Widget
 * Embeddable chat widget for websites
 *
 * Usage:
 * <script>
 *   (function(w,d,s,o,f,js,fjs){
 *     w['ADSappWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
 *     w[o].l=1*new Date();js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
 *     js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
 *   }(window,document,'script','adsapp','https://app.adsapp.nl/widget.js'));
 *   adsapp('init', 'your-organization-id');
 * </script>
 */

(function () {
  'use strict';

  const API_BASE = 'https://app.adsapp.nl';
  const WIDGET_VERSION = '1.0.0';

  let config = null;
  let isOpen = false;
  let container = null;
  let iframe = null;
  let organizationId = null;

  // Process queued commands
  function processQueue() {
    const queue = window.adsapp.q || [];
    queue.forEach(args => {
      const [command, ...params] = args;
      executeCommand(command, params);
    });
  }

  // Execute widget commands
  function executeCommand(command, params) {
    switch (command) {
      case 'init':
        init(params[0], params[1]);
        break;
      case 'open':
        openWidget();
        break;
      case 'close':
        closeWidget();
        break;
      case 'toggle':
        toggleWidget();
        break;
      case 'destroy':
        destroyWidget();
        break;
      case 'setUser':
        setUser(params[0]);
        break;
      default:
        console.warn('[ADSapp Widget] Unknown command:', command);
    }
  }

  // Initialize widget
  async function init(orgId, options = {}) {
    if (!orgId) {
      console.error('[ADSapp Widget] Organization ID is required');
      return;
    }

    organizationId = orgId;

    try {
      // Fetch configuration from API
      const response = await fetch(`${API_BASE}/api/widget/embed/${orgId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[ADSapp Widget] Failed to initialize:', error.error);
        return;
      }

      const data = await response.json();
      config = { ...data.config, ...options };

      // Check business hours
      if (config.businessHours?.enabled && !isWithinBusinessHours(config.businessHours)) {
        config.isOffline = true;
      }

      // Create widget elements
      createWidget();

      // Auto-show after delay
      if (config.delaySeconds > 0) {
        setTimeout(() => {
          showTrigger();
        }, config.delaySeconds * 1000);
      } else {
        showTrigger();
      }

      console.log('[ADSapp Widget] Initialized successfully v' + WIDGET_VERSION);
    } catch (error) {
      console.error('[ADSapp Widget] Initialization error:', error);
    }
  }

  // Check if current time is within business hours
  function isWithinBusinessHours(businessHours) {
    if (!businessHours?.enabled) return true;

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const schedule = businessHours.schedule?.[currentDay];

    if (!schedule) return false;

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: businessHours.timezone || 'Europe/Amsterdam',
    });

    return currentTime >= schedule.start && currentTime <= schedule.end;
  }

  // Create widget DOM elements
  function createWidget() {
    if (container) return;

    // Create container
    container = document.createElement('div');
    container.id = 'adsapp-widget-container';
    container.innerHTML = getWidgetHTML();
    document.body.appendChild(container);

    // Add styles
    const style = document.createElement('style');
    style.textContent = getWidgetCSS();
    document.head.appendChild(style);

    // Add event listeners
    setupEventListeners();
  }

  // Get widget HTML
  function getWidgetHTML() {
    const positionClasses = getPositionClasses();

    return `
      <div id="adsapp-trigger" class="adsapp-trigger ${positionClasses}" style="display: none;">
        <div class="adsapp-trigger-button" style="background-color: ${config.primaryColor}">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span class="adsapp-trigger-text">${config.triggerText || 'Chat met ons'}</span>
        </div>
        ${config.greeting ? `
        <div class="adsapp-greeting" style="border-color: ${config.primaryColor}">
          <button class="adsapp-greeting-close">&times;</button>
          <p>${config.greeting}</p>
        </div>
        ` : ''}
      </div>
      <div id="adsapp-chat" class="adsapp-chat ${positionClasses}" style="display: none;">
        <div class="adsapp-chat-header" style="background-color: ${config.primaryColor}">
          <div class="adsapp-chat-header-info">
            <h3>WhatsApp Chat</h3>
            <span class="adsapp-status">${config.isOffline ? 'Offline' : 'Online'}</span>
          </div>
          <button class="adsapp-chat-close">&times;</button>
        </div>
        <div class="adsapp-chat-body">
          ${config.isOffline ? `
            <div class="adsapp-offline-message">
              <p>${config.offlineMessage || 'Wij zijn momenteel offline. Laat een bericht achter!'}</p>
            </div>
          ` : `
            <div class="adsapp-welcome">
              <div class="adsapp-avatar" style="background-color: ${config.primaryColor}">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <p>${config.greeting || 'Hallo! Hoe kunnen wij u helpen?'}</p>
            </div>
          `}
        </div>
        <div class="adsapp-chat-input">
          <input type="text" placeholder="${config.placeholder || 'Typ uw bericht...'}" id="adsapp-message-input" />
          <button class="adsapp-send-btn" style="background-color: ${config.primaryColor}">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // Get position classes based on config
  function getPositionClasses() {
    const position = config.position || 'bottom-right';
    return `adsapp-position-${position}`;
  }

  // Get widget CSS
  function getWidgetCSS() {
    return `
      #adsapp-widget-container * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      .adsapp-trigger {
        position: fixed;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }

      .adsapp-position-bottom-right { bottom: 20px; right: 20px; }
      .adsapp-position-bottom-left { bottom: 20px; left: 20px; align-items: flex-start; }
      .adsapp-position-top-right { top: 20px; right: 20px; flex-direction: column-reverse; }
      .adsapp-position-top-left { top: 20px; left: 20px; flex-direction: column-reverse; align-items: flex-start; }

      .adsapp-trigger-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .adsapp-trigger-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .adsapp-trigger-text {
        color: white;
        font-weight: 600;
        font-size: 14px;
      }

      .adsapp-greeting {
        background: white;
        border-radius: 12px;
        padding: 16px;
        max-width: 280px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        position: relative;
        border-left: 4px solid;
      }

      .adsapp-greeting p {
        margin: 0;
        font-size: 14px;
        color: #333;
      }

      .adsapp-greeting-close {
        position: absolute;
        top: 4px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
      }

      .adsapp-chat {
        position: fixed;
        z-index: 99999;
        width: 380px;
        height: 520px;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        background: white;
      }

      .adsapp-chat.adsapp-position-bottom-right { bottom: 20px; right: 20px; }
      .adsapp-chat.adsapp-position-bottom-left { bottom: 20px; left: 20px; }
      .adsapp-chat.adsapp-position-top-right { top: 20px; right: 20px; }
      .adsapp-chat.adsapp-position-top-left { top: 20px; left: 20px; }

      .adsapp-chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        color: white;
      }

      .adsapp-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .adsapp-status {
        font-size: 12px;
        opacity: 0.9;
      }

      .adsapp-chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .adsapp-chat-body {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #f5f5f5;
      }

      .adsapp-welcome {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
      }

      .adsapp-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .adsapp-welcome p {
        color: #666;
        font-size: 14px;
        margin: 0;
      }

      .adsapp-offline-message {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;
        padding: 16px;
      }

      .adsapp-offline-message p {
        margin: 0;
        color: #856404;
        font-size: 14px;
      }

      .adsapp-chat-input {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #eee;
        background: white;
      }

      .adsapp-chat-input input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 24px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
      }

      .adsapp-chat-input input:focus {
        border-color: #25D366;
      }

      .adsapp-send-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .adsapp-send-btn:hover {
        opacity: 0.9;
      }

      @media (max-width: 480px) {
        .adsapp-chat {
          width: 100%;
          height: 100%;
          border-radius: 0;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
      }
    `;
  }

  // Setup event listeners
  function setupEventListeners() {
    // Trigger button click
    const triggerButton = document.querySelector('.adsapp-trigger-button');
    if (triggerButton) {
      triggerButton.addEventListener('click', openWidget);
    }

    // Greeting close button
    const greetingClose = document.querySelector('.adsapp-greeting-close');
    if (greetingClose) {
      greetingClose.addEventListener('click', (e) => {
        e.stopPropagation();
        const greeting = document.querySelector('.adsapp-greeting');
        if (greeting) greeting.style.display = 'none';
      });
    }

    // Chat close button
    const chatClose = document.querySelector('.adsapp-chat-close');
    if (chatClose) {
      chatClose.addEventListener('click', closeWidget);
    }

    // Send button
    const sendBtn = document.querySelector('.adsapp-send-btn');
    const messageInput = document.getElementById('adsapp-message-input');

    if (sendBtn && messageInput) {
      sendBtn.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }
  }

  // Show trigger button
  function showTrigger() {
    const trigger = document.getElementById('adsapp-trigger');
    if (trigger) {
      trigger.style.display = 'flex';
    }
  }

  // Open widget
  function openWidget() {
    const trigger = document.getElementById('adsapp-trigger');
    const chat = document.getElementById('adsapp-chat');

    if (trigger) trigger.style.display = 'none';
    if (chat) chat.style.display = 'flex';
    isOpen = true;
  }

  // Close widget
  function closeWidget() {
    const trigger = document.getElementById('adsapp-trigger');
    const chat = document.getElementById('adsapp-chat');

    if (chat) chat.style.display = 'none';
    if (trigger) trigger.style.display = 'flex';
    isOpen = false;
  }

  // Toggle widget
  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  // Send message (opens WhatsApp)
  function sendMessage() {
    const messageInput = document.getElementById('adsapp-message-input');
    const message = messageInput?.value?.trim();

    if (!message) return;

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Clear input
    if (messageInput) messageInput.value = '';
  }

  // Destroy widget
  function destroyWidget() {
    if (container) {
      container.remove();
      container = null;
    }
    config = null;
    isOpen = false;
  }

  // Set user info for tracking
  function setUser(userData) {
    // Store user data for analytics
    window.adsappUser = userData;
  }

  // Replace queue function with executor
  window.adsapp = function () {
    const args = Array.prototype.slice.call(arguments);
    const [command, ...params] = args;
    executeCommand(command, params);
  };

  // Process any queued commands
  processQueue();
})();
