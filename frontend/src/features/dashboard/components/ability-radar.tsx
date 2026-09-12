import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'

const data = [
  { subject: '遥感基础', value: 85 },
  { subject: 'Python', value: 72 },
  { subject: '数据处理', value: 68 },
  { subject: '影像处理', value: 60 },
  { subject: '深度学习', value: 45 },
  { subject: 'Transformer', value: 30 },
  { subject: '大模型', value: 20 },
]

export function AbilityRadar() {
  return (
    <div className='h-full min-h-[160px] w-full rounded-2xl border border-cyan-400/10 bg-slate-900/80 p-2 shadow-inner shadow-slate-950/50'>
      <ResponsiveContainer width='100%' height='100%'>
        <RadarChart data={data} cx='50%' cy='50%' outerRadius='70%'>
          <defs>
            <linearGradient id='radarFill' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='#7dd3fc' stopOpacity={0.8} />
              <stop offset='55%' stopColor='#60a5fa' stopOpacity={0.52} />
              <stop offset='100%' stopColor='#8b5cf6' stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <PolarGrid stroke='#334155' strokeDasharray='2 3' />
          <PolarAngleAxis
            dataKey='subject'
            tick={{ fill: '#cbd5e1', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            dataKey='value'
            stroke='#7dd3fc'
            fill='url(#radarFill)'
            fillOpacity={0.8}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}