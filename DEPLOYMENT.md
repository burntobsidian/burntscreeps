# Screeps Deployment Guide

## Elite Foundation Ready for Deployment! 🚀

Your elite Screeps AI is built and ready for world domination. Here's how to deploy it:

## Option 1: Manual Deployment (Recommended)

### 1. Build the Code
```bash
bun run build
```

### 2. Copy to Screeps
1. Open your Screeps game console (https://screeps.com/)
2. Go to the Script tab
3. Copy the contents of `dist/index.js` 
4. Paste into your main module in Screeps
5. Click "Commit Changes"

### 3. Launch Your Empire
Your AI will automatically:
- ✅ Analyze room and establish economic dominance
- ✅ Spawn optimized creep compositions 
- ✅ Build defensive towers and infrastructure
- ✅ Scale to multiple rooms as GCL increases

## Option 2: Automated Deployment

### 1. Configure Credentials
Edit `screeps.json` with your account details:
```json
{
  "email": "your_email@example.com", 
  "password": "your_password",
  "branch": "main"
}
```

### 2. Deploy
```bash
bun run upload
```

## Strategy Execution

Once deployed, your AI will execute our elite strategy:

### Phase 1: Bootstrap Supremacy (Ticks 1-15000)
- **Immediate**: Harvester + Upgrader spawning
- **Tick 200**: Container-based mining starts  
- **RCL 2**: Transition to miner/hauler economy
- **RCL 3**: First tower for defense

### Phase 2: Economic Hegemony (Ticks 15000-50000)  
- **RCL 4**: Storage enables advanced logistics
- **RCL 5**: Link network for energy efficiency
- **RCL 6**: Terminal unlocks market operations

### Phase 3: Regional Control
- Automated expansion planning
- Advanced construction queuing
- Military preparation systems

## Monitoring Your Empire

Watch the console for status updates every 100 ticks:
```
[12345] CPU: 15.23/20 | GCL: 2 | Rooms: 1
```

## Elite Features Active

✅ **State Machine Creeps**: 5 specialized roles with optimal bodies  
✅ **Intelligent Construction**: RCL-aware building with priority queues  
✅ **Advanced Analytics**: Real-time room intelligence and threat assessment  
✅ **Performance Optimized**: Sub-20 CPU with caching and efficient algorithms  
✅ **Professional Architecture**: TypeScript, modular design, error handling  

## Next Phase Development

Ready to add when you need more power:
- 🔄 Remote mining capabilities
- ⚔️ Military attack systems  
- 📈 Market trading algorithms
- ⚡ Power creep management
- 🛣️ Advanced pathfinding

Your foundation is **elite-tier** and ready to compete with the best players in Screeps!

## Troubleshooting

### Common Issues:
- **No creeps spawning**: Check energy levels and spawn availability
- **Construction not starting**: Verify RCL requirements and available construction sites  
- **High CPU usage**: Monitor console for error messages

### Debug Commands:
```javascript
// Check memory state
console.log(JSON.stringify(Memory.rooms, null, 2))

// View spawn queue  
console.log(JSON.stringify(SpawnManager.getQueueStatus(), null, 2))
```

Ready to dominate the Screeps universe! 🌟