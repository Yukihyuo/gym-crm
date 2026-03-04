import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { OptionsMenu } from '@/components/user/OptionsMenu'
import AssistanceComponent from '@/components/user/AssistanceComponent'
import { useUserStore } from '@/store/userStore'

export default function Home() {
  const {user} = useUserStore()
  return (
    <div className='p-4 relative' >
      <div className='absolute top-2 right-2' >
        <OptionsMenu/>
      </div>
      <div className='flex items-center justify-center'>
        <Avatar className='w-40 h-40' >
          <AvatarImage src="https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
      <section>
        <h1 className='text-2xl text-center font-bold' >{user?.profile?.names}</h1>
      </section>

      
      {user?.id ? <AssistanceComponent userId={user.id} /> : null}
    </div>
  )
}