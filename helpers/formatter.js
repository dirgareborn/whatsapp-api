const phoneNumberFormatter = function(number){
    // menghilangkan karakter selain angka
    let formatted = number.replace(/\D/g,'');
    // menghilangkan angka 0 didepan nomor
    // ganti 62 (sesuaikan kode negara)
    if (formatted.startsWith('0')){
        formatted = '62' +formatted.substr(1);
    }
    if (!formatted.endsWith('@.us')){
        formatted += '@c.us';
    }
    return formatted;
}

module.exports = {
    phoneNumberFormatter
}