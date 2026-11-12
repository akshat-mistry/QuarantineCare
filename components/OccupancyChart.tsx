'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
export default function OccupancyChart({ data }: { data: { name: string; occupied: number; free: number }[] }) {
  return (<ResponsiveContainer width="100%" height={260}><BarChart data={data}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
    <Bar dataKey="occupied" stackId="a" fill="#0f766e" /><Bar dataKey="free" stackId="a" fill="#99f6e4" /></BarChart></ResponsiveContainer>)
}
