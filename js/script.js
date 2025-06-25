// DOM Elements
const confessForm = document.getElementById('confessForm');
const phoneInput = document.getElementById('phoneNumber');
const messageInput = document.getElementById('confessMessage');
const senderInput = document.getElementById('senderName');
const charCount = document.getElementById('charCount');
const submitBtn = document.querySelector('.submit-btn');
const modal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModal');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Character counter
    messageInput.addEventListener('input', updateCharCounter);
    
    // Phone number formatting
    phoneInput.addEventListener('input', formatPhoneNumber);
    
    // Form submission
    confessForm.addEventListener('submit', handleFormSubmit);
    
    // Modal close
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
    
    // Button ripple effect
    submitBtn.addEventListener('click', createRipple);
    
    // Input validation
    setupInputValidation();
    
    // Initial character count
    updateCharCounter();
}

// Character Counter
function updateCharCounter() {
    const currentLength = messageInput.value.length;
    const maxLength = 500;
    
    charCount.textContent = currentLength;
    
    if (currentLength > maxLength * 0.9) {
        charCount.parentElement.classList.add('warning');
    } else {
        charCount.parentElement.classList.remove('warning');
    }
}

// Phone Number Formatting
function formatPhoneNumber() {
    let value = phoneInput.value.replace(/\D/g, ''); // Remove non-digits
    
    // Ensure it starts with 62 for Indonesia
    if (value.length > 0 && !value.startsWith('62')) {
        if (value.startsWith('0')) {
            value = '62' + value.substring(1);
        } else if (value.startsWith('8')) {
            value = '62' + value;
        }
    }
    
    phoneInput.value = value;
    validatePhoneNumber();
}

// Phone Number Validation
function validatePhoneNumber() {
    const phone = phoneInput.value;
    const isValid = /^62[0-9]{9,13}$/.test(phone);
    
    if (phone.length > 0 && !isValid) {
        phoneInput.classList.add('input-error');
        showError(phoneInput, 'Format nomor tidak valid. Contoh: 628123456789');
    } else {
        phoneInput.classList.remove('input-error');
        hideError(phoneInput);
    }
    
    return isValid;
}

// Input Validation Setup
function setupInputValidation() {
    // Real-time validation
    phoneInput.addEventListener('blur', validatePhoneNumber);
    messageInput.addEventListener('blur', validateMessage);
    
    // Remove error on focus
    [phoneInput, messageInput, senderInput].forEach(input => {
        input.addEventListener('focus', function() {
            this.classList.remove('input-error');
            hideError(this);
        });
    });
}

// Message Validation
function validateMessage() {
    const message = messageInput.value.trim();
    const isValid = message.length >= 10 && message.length <= 500;
    
    if (message.length > 0 && !isValid) {
        messageInput.classList.add('input-error');
        if (message.length < 10) {
            showError(messageInput, 'Pesan minimal 10 karakter');
        } else {
            showError(messageInput, 'Pesan maksimal 500 karakter');
        }
    } else {
        messageInput.classList.remove('input-error');
        hideError(messageInput);
    }
    
    return isValid;
}

// Show Error Message
function showError(input, message) {
    hideError(input); // Remove existing error
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

// Hide Error Message
function hideError(input) {
    const existingError = input.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
}

// Form Submission Handler
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate all fields
    const isPhoneValid = validatePhoneNumber();
    const isMessageValid = validateMessage();

    if (!isPhoneValid || !isMessageValid) {
        showNotification('Mohon perbaiki kesalahan pada form', 'error');
        return;
    }

    setLoadingState(true);

    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();
    const sender = senderInput.value.trim() || 'Anonim';

    try {
        const response = await fetch('/api/send-confess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: phone,
                message: message,
                senderName: sender
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Pesan confess berhasil dikirim!', 'success');
            confessForm.reset();
            updateCharCounter();
        } else {
            showNotification(result.error || 'Gagal mengirim pesan', 'error');
        }
    } catch (error) {
        showNotification('Terjadi kesalahan saat mengirim pesan', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Remove or comment out sendToWhatsApp function and its usage to prevent redirect
// function sendToWhatsApp() {
//     // This function is no longer used
// }

// Send to WhatsApp
function sendToWhatsApp() {
    const phone = phoneInput.value;
    const message = messageInput.value.trim();
    const sender = senderInput.value.trim() || 'Seseorang';
    
    // Format message
    const formattedMessage = formatConfessMessage(message, sender);
    
    // Create WhatsApp URL
    const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(formattedMessage)}`;
    
    // Show success modal
    showModal();
    
    // Open WhatsApp after modal is shown
    setTimeout(() => {
        window.open(whatsappURL, '_blank');
        resetForm();
    }, 1500);
}

// Format Confession Message
function formatConfessMessage(message, sender) {
    const timestamp = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let formattedMessage = `💌 *CONFESS ANONYMOUS* 💌\n\n`;
    formattedMessage += `📝 *Pesan:*\n${message}\n\n`;
    formattedMessage += `👤 *Dari:* ${sender}\n`;
    formattedMessage += `🕐 *Waktu:* ${timestamp}\n\n`;
    formattedMessage += `_Pesan ini dikirim melalui Confess Anonymous_\n`;
    formattedMessage += `_🔒 Identitas pengirim terlindungi_`;
    
    return formattedMessage;
}

// Loading State
function setLoadingState(isLoading) {
    const btnText = submitBtn.querySelector('span:not(.btn-ripple)');
    const btnIcon = submitBtn.querySelector('i');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        btnIcon.className = 'loading';
        if (btnText) btnText.textContent = 'Mengirim...';
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        btnIcon.className = 'fab fa-whatsapp';
        if (btnText) btnText.textContent = 'Kirim ke WhatsApp';
    }
}

// Button Ripple Effect
function createRipple(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('btn-ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Modal Functions
function showModal() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Add animation class
    setTimeout(() => {
        modal.querySelector('.modal-content').style.animation = 'modalSlideIn 0.3s ease';
    }, 10);
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Reset Form
function resetForm() {
    confessForm.reset();
    updateCharCounter();
    
    // Remove any error states
    [phoneInput, messageInput, senderInput].forEach(input => {
        input.classList.remove('input-error');
        hideError(input);
    });
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'error' ? '#ff6b6b' : '#667eea',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: '1001',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.9rem',
        fontWeight: '500',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!submitBtn.disabled) {
            confessForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
    }
});

// Prevent form submission on Enter in input fields
[phoneInput, senderInput].forEach(input => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextInput = this.parentNode.nextElementSibling?.querySelector('input, textarea');
            if (nextInput) {
                nextInput.focus();
            }
        }
    });
});

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

// Copy to clipboard functionality (for sharing)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Link berhasil disalin!', 'success');
    }).catch(() => {
        showNotification('Gagal menyalin link', 'error');
    });
}

// Share functionality
function shareWebsite() {
    const url = window.location.href;
    const text = 'Kirim confess anonymous mu disini!';
    
    if (navigator.share) {
        navigator.share({
            title: 'Confess Anonymous',
            text: text,
            url: url
        });
    } else {
        copyToClipboard(url);
    }
}

// Analytics (optional - for tracking usage)
function trackEvent(eventName, properties = {}) {
    // You can integrate with analytics services here
    console.log('Event:', eventName, properties);
}

// Track form submission
confessForm.addEventListener('submit', () => {
    trackEvent('confess_submitted', {
        message_length: messageInput.value.length,
        has_sender_name: senderInput.value.trim().length > 0
    });
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Dark mode toggle (bonus feature)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// Easter egg - Konami code
let konamiCode = [];
const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.keyCode);
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        showNotification('🎉 Easter egg found! You are awesome!', 'success');
        // Add some fun animation
        document.body.style.animation = 'rainbow 2s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 2000);
    }
});

// Add rainbow animation for easter egg
const style = document.createElement('style');
style.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
`;
document.head.appendChild(style);
