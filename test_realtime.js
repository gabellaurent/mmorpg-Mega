import { createClient } from '@supabase/supabase-js';

const url = 'https://pspmwhcteobbinyeeggs.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcG13aGN0ZW9iYmlueWVlZ2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTUzODMsImV4cCI6MjA5MTAzMTM4M30.x5qjnYL18_yTUV6kuBHLPMrcEQTLYvNXnWrxNCcbif8';

const supabase = createClient(url, key);

console.log('Testing Supabase Realtime connection...');

const channel = supabase.channel('room-1', {
  config: { broadcast: { ack: true } }
});

channel.on('broadcast', { event: 'test' }, (msg) => {
  console.log('RECEIVED BROADCAST:', msg);
});

channel.subscribe((status, err) => {
  console.log('SUBSCRIBE STATUS:', status, err || '');
  if (status === 'SUBSCRIBED') {
    console.log('Sending test broadcast...');
    channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'hello world' }
    }).then(res => {
      console.log('SEND RESULT:', res);
      process.exit(0);
    }).catch(e => {
      console.error('SEND ERROR:', e);
      process.exit(1);
    });
  }
});

setTimeout(() => {
  console.log('Timeout reached');
  process.exit(1);
}, 8000);
