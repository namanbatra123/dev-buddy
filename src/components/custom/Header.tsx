import React from 'react'
import Image from 'next/image'
import Logo from '@/../public/logo.png'
import { Button } from '../ui/button'

export default function Header() {
  return (
    <div className='border-b-1 flex items-center justify-between pr-10 pl-10'>
      <Image src={Logo} width={80} height={80} alt='logo'/>
      <Button className='bg-blue-100' variant='outline'>Sign in</Button>
    </div>
  )
}
