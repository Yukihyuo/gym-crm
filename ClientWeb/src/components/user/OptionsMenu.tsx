import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import LogOutButton from "@/components/user/LogOutButton"

import { Dumbbell, Menu, Salad, } from "lucide-react"
import { QRUserCode } from "./QRUserCode"
import { Link } from "react-router-dom"

export function OptionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Opciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <QRUserCode />
          <Link to="/trainings" >
            <DropdownMenuItem> <Dumbbell /> Entrenamientos</DropdownMenuItem>
          </Link>
          <Link to="/diets" >
            <DropdownMenuItem><Salad /> Dietas</DropdownMenuItem>
          </Link>
          {/* <DropdownMenuItem>Settings</DropdownMenuItem> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <LogOutButton />
        {/* <DropdownMenuItem disabled>API</DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
