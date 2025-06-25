const confessForm = document.getElementById('confessForm');
const sendBtn = document.getElementById('sendBtn');
const responseMessage = document.getElementById('responseMessage');

confessForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    sendBtn.disabled = true;
    sendBtn.textContent = 'Mengirim...';
    responseMessage.textContent = '';
    responseMessage.className = 'message';

    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const message = document.getElementById('message').value.trim();
    const senderNameInput = document.getElementById('senderName').value.trim();
    const senderName = senderNameInput === '' ? 'Anonim' : senderNameInput;

    try {
        const response = await fetch('/api/send-confess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber,
                message,
                senderName
            })
        });

        const result = await response.json();

        if (result.success) {
            responseMessage.textContent = 'Pesan berhasil dikirim!';
            responseMessage.classList.add('success');
            confessForm.reset();
        } else {
            responseMessage.textContent = 'Gagal mengirim pesan: ' + (result.error || 'Terjadi kesalahan');
            responseMessage.classList.add('error');
        }
    } catch (error) {
        responseMessage.textContent = 'Error: ' + error.message;
        responseMessage.classList.add('error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Kirim ke WhatsApp';
    }
});
