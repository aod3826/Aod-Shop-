import liff from '@line/liff'

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID

if (!LIFF_ID) {
  throw new Error('Missing LINE LIFF ID')
}

export const initLiff = async () => {
  try {
    await liff.init({ liffId: LIFF_ID })
    
    if (!liff.isLoggedIn()) {
      liff.login()
      return null
    }
    
    const profile = await liff.getProfile()
    const context = liff.getContext()
    
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
      context,
    }
  } catch (error) {
    console.error('LIFF initialization failed:', error)
    throw error
  }
}

export const sendOrderNotification = async (orderData: {
  orderNumber: string
  totalAmount: number
  customerName: string
  shippingAddress: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
}) => {
  try {
    // Send to customer
    if (liff.isInClient()) {
      await liff.sendMessages([
        {
          type: 'flex',
          altText: `Order #${orderData.orderNumber} Confirmation`,
          contents: {
            type: 'bubble',
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '🎉 Order Confirmed!',
                  weight: 'bold',
                  size: 'xl',
                  color: '#1DB446',
                },
                {
                  type: 'text',
                  text: `Order #${orderData.orderNumber}`,
                  size: 'sm',
                  color: '#888888',
                  margin: 'md',
                },
              ],
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'separator',
                  margin: 'md',
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'lg',
                  spacing: 'sm',
                  contents: orderData.items.map(item => ({
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: `${item.quantity}x`,
                        size: 'sm',
                        color: '#555555',
                        flex: 0,
                      },
                      {
                        type: 'text',
                        text: item.name,
                        size: 'sm',
                        color: '#555555',
                        flex: 1,
                        wrap: true,
                      },
                      {
                        type: 'text',
                        text: `฿${item.price * item.quantity}`,
                        size: 'sm',
                        color: '#111111',
                        align: 'end',
                      },
                    ],
                  })),
                },
                {
                  type: 'separator',
                  margin: 'lg',
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'lg',
                  contents: [
                    {
                      type: 'text',
                      text: 'Total',
                      size: 'md',
                      weight: 'bold',
                      color: '#111111',
                    },
                    {
                      type: 'text',
                      text: `฿${orderData.totalAmount}`,
                      size: 'md',
                      weight: 'bold',
                      color: '#111111',
                      align: 'end',
                    },
                  ],
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'View Order Details',
                    uri: `${window.location.origin}/orders`,
                  },
                  style: 'primary',
                  color: '#1DB446',
                },
              ],
            },
          },
        },
      ])
    }
    
    // Send to admin via LINE Notify (if configured)
    await sendAdminNotification(orderData)
  } catch (error) {
    console.error('Failed to send LINE notification:', error)
    // Don't throw error - notification failure shouldn't break order flow
  }
}

const sendAdminNotification = async (orderData: any) => {
  try {
    // Get store settings for LINE Notify token
    const { supabase } = await import('./supabaseClient')
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('line_notify_token, line_notify_user_id')
      .single()
    
    if (!storeSettings?.line_notify_token) {
      return
    }
    
    const message = `
🛒 New Order Alert!
Order: #${orderData.orderNumber}
Customer: ${orderData.customerName}
Amount: ฿${orderData.totalAmount}
Items: ${orderData.items.length}
Address: ${orderData.shippingAddress}
Time: ${new Date().toLocaleString()}
    `.trim()
    
    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${storeSettings.line_notify_token}`,
      },
      body: new URLSearchParams({
        message,
      }),
    })
  } catch (error) {
    console.error('Failed to send admin notification:', error)
  }
}

export const shareToLine = async (text: string, url?: string) => {
  try {
    if (liff.isApiAvailable('shareTargetPicker')) {
      await liff.shareTargetPicker([
        {
          type: 'text',
          text: text + (url ? `\n${url}` : ''),
        },
      ])
    }
  } catch (error) {
    console.error('Failed to share to LINE:', error)
  }
}
