/**
 * OLIPOP – Shared BroadcastChannel
 * ใช้สำหรับสื่อสารระหว่าง ipad.html และ screen-*.html ทุกจอ
 * ทุกหน้าต้องโหลดไฟล์นี้ก่อน config.js
 */

const OLIPOP_CHANNEL = new BroadcastChannel('olipop-screens');

/**
 * ส่ง event เมื่อเลือกสินค้า (เรียกจาก ipad.html)
 * @param {Object} product - ข้อมูลสินค้าจาก PRODUCTS array
 */
function broadcastProduct(product) {
    // บันทึกสถานะล่าสุดไว้ใน localStorage เพื่อให้หน้าจอที่เปิดใหม่ Sync ได้ทันที
    localStorage.setItem('olipop_last_selected', JSON.stringify(product));

    OLIPOP_CHANNEL.postMessage({
        type: 'PRODUCT_SELECT',
        payload: product,
        ts: Date.now(),
    });
}

/**
 * รับ event บนจออื่น
 * @param {Function} callback - fn(product)
 */
function onProductSelect(callback) {
    // เช็คสถานะล่าสุดก่อน (Initial Sync)
    const lastSelected = localStorage.getItem('olipop_last_selected');
    if (lastSelected) {
        try {
            callback(JSON.parse(lastSelected));
        } catch (e) {
            console.error('Failed to parse last selected product', e);
        }
    }

    OLIPOP_CHANNEL.onmessage = (e) => {
        if (e.data?.type === 'PRODUCT_SELECT') {
            callback(e.data.payload);
        }
    };
}
