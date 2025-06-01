import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import mqtt from 'mqtt';

export default function App() {
  const [device, setDevice] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [delay, setDelay] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [powerState, setPowerState] = useState('Unknown');

  const clientRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt');

    client.on('connect', () => {
      setStatus('✅ Connected to MQTT broker');
    });

    client.on('error', (err) => {
      setStatus(`❌ Error: ${err.message}`);
    });

    client.on('message', (topic, message) => {
      if (topic.includes('/POWER')) {
        setPowerState(message.toString());
      }
    });

    clientRef.current = client;

    return () => {
      client.end();
    };
  }, []);

  const togglePower = () => {
    const dev = device.trim();
    if (!dev) {
      setStatus('⚠️ Please enter a device name');
      return;
    }

    const topic = `cmnd/${dev}/Power`;
    clientRef.current.publish(topic, 'TOGGLE');
    setStatus(`🔁 Sent TOGGLE to ${topic}`);

    // Subscribe to power state feedback
    const feedbackTopic = `stat/${dev}/POWER`;
    clientRef.current.subscribe(feedbackTopic, (err) => {
      if (err) {
        setStatus(`❌ Failed to subscribe to ${feedbackTopic}`);
      }
    });
  };

  const scheduleToggle = () => {
    const dev = device.trim();
    const delaySec = parseInt(delay, 10);

    if (!dev || isNaN(delaySec) || delaySec <= 0) {
      setStatus('⚠️ Please enter a valid device and delay');
      return;
    }

    let timeLeft = delaySec;
    setCountdown(timeLeft);
    setStatus(`⏳ Toggling in ${timeLeft} seconds`);

    countdownRef.current = setInterval(() => {
      timeLeft--;
      setCountdown(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        togglePower();
      }
    }, 1000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🔌 Tasmota controller</Text>

      <TextInput
        placeholder="Enter device name (e.g., tasmota_1234)"
        value={device}
        onChangeText={setDevice}
        style={styles.input}
      />

      <View style={styles.button}>
        <Button title="Toggle Power Now" onPress={togglePower} />
      </View>

      <TextInput
        placeholder="Delay (seconds)"
        value={delay}
        onChangeText={setDelay}
        keyboardType="numeric"
        style={styles.input}
      />

      <View style={styles.button}>
        <Button title="Schedule Toggle" onPress={scheduleToggle} />
      </View>

      <Text style={styles.status}>{status}</Text>

      {countdown !== null && (
        <Text style={styles.countdown}>⏳ Countdown: {countdown}s</Text>
      )}

      <Text style={styles.feedback}>
        📡 Device Power State: <Text style={{ fontWeight: 'bold' }}>{powerState}</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f9fafa',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  button: {
    marginBottom: 15,
  },
  status: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  countdown: {
    fontSize: 18,
    textAlign: 'center',
    color: '#007bff',
    marginTop: 10,
  },
  feedback: {
    fontSize: 18,
    marginTop: 30,
    textAlign: 'center',
    color: '#222',
  },
});
